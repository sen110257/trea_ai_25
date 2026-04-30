import { imageToCanvas, canvasToDataURL } from './image'

export async function removeBackground(img, options = {}) {
  const {
    method = 'auto',
    threshold = 0.5,
    edgeSmooth = 2,
    colorKey = null,
    colorTolerance = 30
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = img.width
  canvas.height = img.height

  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  if (method === 'auto') {
    await removeBackgroundAuto(data, canvas.width, canvas.height, threshold)
  } else if (method === 'color') {
    removeBackgroundByColor(data, canvas.width, canvas.height, colorKey, colorTolerance)
  }

  if (edgeSmooth > 0) {
    smoothEdges(data, canvas.width, canvas.height, edgeSmooth)
  }

  ctx.putImageData(imageData, 0, 0)

  const dataURL = canvasToDataURL(canvas)

  return {
    dataURL,
    method,
    threshold,
    edgeSmooth
  }
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
      data[i + 3] = Math.max(0, data[i + 3] * (saliency / thresholdValue) * 0.5)
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
      const centerWeight = 1 - (dist / maxDist) * 0.5
      
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

function smoothEdges(data, width, height, radius) {
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
