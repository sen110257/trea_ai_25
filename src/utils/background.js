import { imageToCanvas, canvasToDataURL, dataURLToImage } from './image'

export async function replaceBackground(img, options = {}) {
  const {
    type = 'solid',
    color = '#ffffff',
    gradientStart = '#667eea',
    gradientEnd = '#764ba2',
    backgroundImage = null,
    tolerance = 30
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
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const tempCtx = tempCanvas.getContext('2d')
  const tempData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

  const data = imageData.data
  const tempPixelData = tempData.data

  for (let i = 0; i < tempPixelData.length; i += 4) {
    const r = tempPixelData[i]
    const g = tempPixelData[i + 1]
    const b = tempPixelData[i + 2]
    const a = tempPixelData[i + 3]

    if (a > 0) {
      const edges = detectEdges(tempPixelData, i, canvas.width, canvas.height)
      const antiAliasedAlpha = edges ? Math.max(a, edges.alpha) : a
      
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = antiAliasedAlpha
    }
  }

  ctx.putImageData(imageData, 0, 0)

  ctx.globalCompositeOperation = 'destination-over'
  ctx.drawImage(img, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  const dataURL = canvasToDataURL(canvas)

  return {
    dataURL,
    type,
    color,
    gradientStart,
    gradientEnd
  }
}

function detectEdges(pixelData, index, width, height) {
  const x = (index / 4) % width
  const y = Math.floor((index / 4) / width)
  
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ]

  let edgeAlpha = 0
  let isEdge = false

  for (const [dx, dy] of neighbors) {
    const nx = x + dx
    const ny = y + dy
    
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const nIndex = (ny * width + nx) * 4
      const nAlpha = pixelData[nIndex + 3]
      
      if (nAlpha < 255) {
        isEdge = true
        edgeAlpha = Math.max(edgeAlpha, pixelData[index + 3])
      }
    }
  }

  return isEdge ? { alpha: edgeAlpha } : null
}

export function parseColor(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}
