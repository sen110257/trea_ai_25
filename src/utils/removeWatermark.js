import { imageToCanvas, canvasToDataURL } from './image'

export async function removeWatermark(img, options = {}) {
  const {
    selections = [],
    brushStrokes = [],
    mode = 'selection',
    brushSize = 20
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = img.width
  canvas.height = img.height

  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  if (mode === 'selection' && selections.length > 0) {
    for (const selection of selections) {
      const { x, y, width, height } = selection
      inpaintSelection(data, canvas.width, canvas.height, x, y, width, height)
    }
  } else if (mode === 'brush' && brushStrokes.length > 0) {
    for (const stroke of brushStrokes) {
      inpaintStroke(data, canvas.width, canvas.height, stroke, brushSize)
    }
  }

  ctx.putImageData(imageData, 0, 0)

  const dataURL = canvasToDataURL(canvas)

  return {
    dataURL,
    selections,
    brushStrokes,
    mode
  }
}

function inpaintSelection(data, width, height, x, y, selWidth, selHeight) {
  const startX = Math.max(0, Math.floor(x))
  const startY = Math.max(0, Math.floor(y))
  const endX = Math.min(width - 1, Math.floor(x + selWidth))
  const endY = Math.min(height - 1, Math.floor(y + selHeight))

  const sampleRadius = Math.min(30, Math.floor(Math.max(selWidth, selHeight) / 4))

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      const idx = (py * width + px) * 4

      const neighbors = getNeighborhoodPixels(data, width, height, px, py, sampleRadius, { x: startX, y: startY, width: selWidth, height: selHeight })

      if (neighbors.length > 0) {
        const averageColor = averagePixelColors(neighbors)
        data[idx] = averageColor.r
        data[idx + 1] = averageColor.g
        data[idx + 2] = averageColor.b
        data[idx + 3] = averageColor.a
      }
    }
  }

  blendEdges(data, width, height, startX, startY, endX, endY, 5)
}

function inpaintStroke(data, width, height, stroke, brushSize) {
  const points = stroke.points || [stroke]
  const radius = Math.floor(brushSize / 2)

  for (const point of points) {
    const { x, y } = point
    const startX = Math.max(0, Math.floor(x - radius))
    const startY = Math.max(0, Math.floor(y - radius))
    const endX = Math.min(width - 1, Math.floor(x + radius))
    const endY = Math.min(height - 1, Math.floor(y + radius))

    for (let py = startY; py <= endY; py++) {
      for (let px = startX; px <= endX; px++) {
        const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2)
        if (dist <= radius) {
          const idx = (py * width + px) * 4

          const sampleRadius = radius * 2
          const neighbors = getNeighborhoodPixelsExcluding(data, width, height, px, py, sampleRadius, points, radius)

          if (neighbors.length > 0) {
            const averageColor = averagePixelColors(neighbors)
            const blendFactor = 1 - (dist / radius) * 0.3
            
            data[idx] = Math.floor(data[idx] * (1 - blendFactor) + averageColor.r * blendFactor)
            data[idx + 1] = Math.floor(data[idx + 1] * (1 - blendFactor) + averageColor.g * blendFactor)
            data[idx + 2] = Math.floor(data[idx + 2] * (1 - blendFactor) + averageColor.b * blendFactor)
            data[idx + 3] = Math.floor(data[idx + 3] * (1 - blendFactor) + averageColor.a * blendFactor)
          }
        }
      }
    }
  }
}

function getNeighborhoodPixels(data, width, height, x, y, radius, excludeRect) {
  const pixels = []
  const { x: ex, y: ey, width: ew, height: eh } = excludeRect

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx
      const ny = y + dy

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (nx < ex || nx >= ex + ew || ny < ey || ny >= ey + eh) {
          const nidx = (ny * width + nx) * 4
          pixels.push({
            r: data[nidx],
            g: data[nidx + 1],
            b: data[nidx + 2],
            a: data[nidx + 3],
            dist: Math.sqrt(dx * dx + dy * dy)
          })
        }
      }
    }
  }

  return pixels.sort((a, b) => a.dist - b.dist).slice(0, 100)
}

function getNeighborhoodPixelsExcluding(data, width, height, x, y, radius, excludePoints, pointRadius) {
  const pixels = []

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx
      const ny = y + dy

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        let isExcluded = false
        
        for (const point of excludePoints) {
          const distToPoint = Math.sqrt((nx - point.x) ** 2 + (ny - point.y) ** 2)
          if (distToPoint <= pointRadius) {
            isExcluded = true
            break
          }
        }

        if (!isExcluded) {
          const nidx = (ny * width + nx) * 4
          pixels.push({
            r: data[nidx],
            g: data[nidx + 1],
            b: data[nidx + 2],
            a: data[nidx + 3],
            dist: Math.sqrt(dx * dx + dy * dy)
          })
        }
      }
    }
  }

  return pixels.sort((a, b) => a.dist - b.dist).slice(0, 100)
}

function averagePixelColors(pixels) {
  if (pixels.length === 0) return { r: 255, g: 255, b: 255, a: 255 }

  let totalR = 0
  let totalG = 0
  let totalB = 0
  let totalA = 0
  let totalWeight = 0

  for (const pixel of pixels) {
    const weight = 1 / (pixel.dist + 1)
    totalR += pixel.r * weight
    totalG += pixel.g * weight
    totalB += pixel.b * weight
    totalA += pixel.a * weight
    totalWeight += weight
  }

  return {
    r: Math.floor(totalR / totalWeight),
    g: Math.floor(totalG / totalWeight),
    b: Math.floor(totalB / totalWeight),
    a: Math.floor(totalA / totalWeight)
  }
}

function blendEdges(data, width, height, startX, startY, endX, endY, blendWidth) {
  for (let i = 1; i <= blendWidth; i++) {
    const factor = i / blendWidth

    if (startY - i >= 0) {
      for (let x = startX; x <= endX; x++) {
        const idx = ((startY - i) * width + x) * 4
        const topIdx = ((startY - i + 1) * width + x) * 4
        
        data[idx] = Math.floor(data[idx] * (1 - factor * 0.3) + data[topIdx] * factor * 0.3)
        data[idx + 1] = Math.floor(data[idx + 1] * (1 - factor * 0.3) + data[topIdx + 1] * factor * 0.3)
        data[idx + 2] = Math.floor(data[idx + 2] * (1 - factor * 0.3) + data[topIdx + 2] * factor * 0.3)
      }
    }

    if (endY + i < height) {
      for (let x = startX; x <= endX; x++) {
        const idx = ((endY + i) * width + x) * 4
        const bottomIdx = ((endY + i - 1) * width + x) * 4
        
        data[idx] = Math.floor(data[idx] * (1 - factor * 0.3) + data[bottomIdx] * factor * 0.3)
        data[idx + 1] = Math.floor(data[idx + 1] * (1 - factor * 0.3) + data[bottomIdx + 1] * factor * 0.3)
        data[idx + 2] = Math.floor(data[idx + 2] * (1 - factor * 0.3) + data[bottomIdx + 2] * factor * 0.3)
      }
    }
  }
}
