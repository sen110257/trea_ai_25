import { imageToCanvas, canvasToDataURL, dataURLToImage } from './image'

export async function replaceBackground(img, options = {}) {
  const {
    type = 'solid',
    color = '#ffffff',
    gradientStart = '#667eea',
    gradientEnd = '#764ba2',
    backgroundImage = null,
    edgeSmooth = 2,
    autoRemoveBg = true,
    removeBgMethod = 'auto',
    removeBgThreshold = 0.5,
    removeBgColor = '#ffffff',
    removeBgTolerance = 30
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = img.width
  canvas.height = img.height

  if (type === 'solid') {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else if (type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, gradientStart)
    gradient.addColorStop(1, gradientEnd)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else if (type === 'image' && backgroundImage) {
    const bgImg = await dataURLToImage(backgroundImage)
    const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height)
    const scaledWidth = bgImg.width * scale
    const scaledHeight = bgImg.height * scale
    const offsetX = (canvas.width - scaledWidth) / 2
    const offsetY = (canvas.height - scaledHeight) / 2
    ctx.drawImage(bgImg, offsetX, offsetY, scaledWidth, scaledHeight)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const tempCanvas = imageToCanvas(img)
  const tempCtx = tempCanvas.getContext('2d')
  const tempData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const tempPixelData = tempData.data

  let hasTransparency = false
  for (let i = 3; i < tempPixelData.length; i += 4) {
    if (tempPixelData[i] < 255) {
      hasTransparency = true
      break
    }
  }

  let processedPixelData = tempPixelData

  if (!hasTransparency && autoRemoveBg) {
    processedPixelData = await autoRemoveBackground(tempPixelData, canvas.width, canvas.height, {
      method: removeBgMethod,
      threshold: removeBgThreshold,
      colorKey: removeBgColor,
      colorTolerance: removeBgTolerance,
      edgeSmooth
    })
    hasTransparency = true
  }

  if (hasTransparency && edgeSmooth > 0) {
    const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const bgData = tempImageData.data

    for (let i = 0; i < processedPixelData.length; i += 4) {
      const srcR = processedPixelData[i]
      const srcG = processedPixelData[i + 1]
      const srcB = processedPixelData[i + 2]
      const srcA = processedPixelData[i + 3]

      if (srcA > 0) {
        const alpha = srcA / 255
        
        if (alpha < 1) {
          bgData[i] = Math.round(srcR * alpha + bgData[i] * (1 - alpha))
          bgData[i + 1] = Math.round(srcG * alpha + bgData[i + 1] * (1 - alpha))
          bgData[i + 2] = Math.round(srcB * alpha + bgData[i + 2] * (1 - alpha))
        } else {
          bgData[i] = srcR
          bgData[i + 1] = srcG
          bgData[i + 2] = srcB
        }
        bgData[i + 3] = 255
      }
    }

    if (edgeSmooth > 0) {
      smoothEdges(bgData, canvas.width, canvas.height, edgeSmooth)
    }

    ctx.putImageData(tempImageData, 0, 0)
  } else {
    ctx.drawImage(img, 0, 0)
  }

  const dataURL = canvasToDataURL(canvas)

  return {
    dataURL,
    type,
    color,
    gradientStart,
    gradientEnd
  }
}

async function autoRemoveBackground(pixelData, width, height, options = {}) {
  const {
    method = 'auto',
    threshold = 0.5,
    colorKey = '#ffffff',
    colorTolerance = 30,
    edgeSmooth = 2
  } = options

  const data = new Uint8ClampedArray(pixelData)

  if (method === 'auto') {
    await removeBackgroundAuto(data, width, height, threshold)
  } else if (method === 'color') {
    removeBackgroundByColor(data, width, height, colorKey, colorTolerance)
  }

  if (edgeSmooth > 0) {
    smoothAlphaEdges(data, width, height, edgeSmooth)
  }

  return data
}

async function removeBackgroundAuto(data, width, height, threshold) {
  const grayData = []
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    const gray = (r + g + b) / 3
    grayData.push(gray)
  }

  const edgeData = detectEdges(grayData, width, height)
  const saliencyMap = createSaliencyMap(edgeData, width, height)
  const thresholdValue = calculateThreshold(saliencyMap, threshold)

  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4
    const saliency = saliencyMap[idx]
    
    if (saliency < thresholdValue) {
      const alphaFactor = saliency / thresholdValue
      data[i + 3] = Math.max(0, Math.floor(data[i + 3] * alphaFactor * 0.5))
    }
  }
}

function removeBackgroundByColor(data, width, height, colorKey, tolerance) {
  if (!colorKey) return

  const keyColor = parseHexColor(colorKey)
  if (!keyColor) return

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    const distance = colorDistance(
      { r, g, b },
      keyColor
    )
    
    if (distance <= tolerance) {
      data[i + 3] = 0
    } else if (distance <= tolerance * 1.5) {
      const alpha = 1 - (distance - tolerance) / (tolerance * 0.5)
      data[i + 3] = Math.floor(data[i + 3] * alpha)
    }
  }
}

function detectEdges(grayData, width, height) {
  const edges = new Array(grayData.length).fill(0)
  
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      
      let gx = 0
      let gy = 0
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (y + ky) * width + (x + kx)
          const k = (ky + 1) * 3 + (kx + 1)
          
          gx += grayData[kidx] * sobelX[k]
          gy += grayData[kidx] * sobelY[k]
        }
      }
      
      edges[idx] = Math.sqrt(gx * gx + gy * gy)
    }
  }
  
  return edges
}

function createSaliencyMap(edgeData, width, height) {
  const saliency = new Array(edgeData.length).fill(0)
  
  const centerX = width / 2
  const centerY = height / 2
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      const centerWeight = 1 - (dist / maxDist) * 0.3
      
      saliency[idx] = edgeData[idx] * centerWeight
    }
  }
  
  return saliency
}

function calculateThreshold(data, threshold) {
  const sorted = [...data].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * threshold)
  return sorted[idx]
}

function smoothAlphaEdges(data, width, height, radius) {
  const tempData = new Uint8ClampedArray(data)
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4
      
      let totalAlpha = 0
      let count = 0
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const kidx = ((y + ky) * width + (x + kx)) * 4
          totalAlpha += tempData[kidx + 3]
          count++
        }
      }
      
      const avgAlpha = totalAlpha / count
      
      if (data[idx + 3] > 0 && data[idx + 3] < 255) {
        data[idx + 3] = Math.floor(avgAlpha)
      }
    }
  }
}

function parseHexColor(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    (c1.r - c2.r) ** 2 +
    (c1.g - c2.g) ** 2 +
    (c1.b - c2.b) ** 2
  )
}

function smoothEdges(data, width, height, radius) {
  const tempData = new Uint8ClampedArray(data)
  const kernelSize = radius * 2 + 1
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const currentAlpha = tempData[idx + 3]
      
      let hasNeighborTransparent = false
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4
            if (tempData[nidx + 3] < 200) {
              hasNeighborTransparent = true
              break
            }
          }
        }
        if (hasNeighborTransparent) break
      }
      
      if (hasNeighborTransparent && currentAlpha > 0) {
        let totalR = 0
        let totalG = 0
        let totalB = 0
        let totalWeight = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist <= radius && nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = (ny * width + nx) * 4
              const weight = 1 - (dist / radius) * 0.5
              
              if (tempData[nidx + 3] > 100) {
                totalR += tempData[nidx] * weight
                totalG += tempData[nidx + 1] * weight
                totalB += tempData[nidx + 2] * weight
                totalWeight += weight
              }
            }
          }
        }
        
        if (totalWeight > 0) {
          data[idx] = Math.round(totalR / totalWeight)
          data[idx + 1] = Math.round(totalG / totalWeight)
          data[idx + 2] = Math.round(totalB / totalWeight)
          data[idx + 3] = 255
        }
      }
    }
  }
}

export function parseColor(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}
