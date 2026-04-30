import { imageToCanvas, canvasToDataURL, dataURLToImage } from './image'

export async function replaceBackground(img, options = {}) {
  const {
    type = 'solid',
    color = '#ffffff',
    gradientStart = '#667eea',
    gradientEnd = '#764ba2',
    backgroundImage = null,
    edgeSmooth = 2
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

  if (hasTransparency && edgeSmooth > 0) {
    const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const bgData = tempImageData.data

    for (let i = 0; i < tempPixelData.length; i += 4) {
      const srcR = tempPixelData[i]
      const srcG = tempPixelData[i + 1]
      const srcB = tempPixelData[i + 2]
      const srcA = tempPixelData[i + 3]

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
