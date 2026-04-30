import { imageToCanvas, canvasToDataURL, dataURLToImage } from './image'

export async function addWatermark(img, options = {}) {
  const {
    type = 'text',
    text = '水印文字',
    textFont = 'Arial',
    textSize = 48,
    textColor = '#000000',
    textOpacity = 0.3,
    imageWatermark = null,
    mode = 'tile',
    position = 'center',
    rotation = 0,
    scale = 1,
    spacing = 50,
    opacity = 0.3
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = img.width
  canvas.height = img.height

  ctx.drawImage(img, 0, 0)

  ctx.save()
  ctx.globalAlpha = opacity

  const radians = (rotation * Math.PI) / 180

  if (type === 'text') {
    ctx.font = `${textSize * scale}px ${textFont}`
    ctx.fillStyle = textColor
    ctx.globalAlpha = textOpacity
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const metrics = ctx.measureText(text)
    const textWidth = metrics.width
    const textHeight = textSize * scale

    if (mode === 'tile') {
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      
      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
      const cols = Math.ceil(diagonal / (textWidth + spacing))
      const rows = Math.ceil(diagonal / (textHeight + spacing))

      for (let row = -rows; row <= rows; row++) {
        for (let col = -cols; col <= cols; col++) {
          const x = col * (textWidth + spacing)
          const y = row * (textHeight + spacing)
          ctx.fillText(text, x, y)
        }
      }
    } else if (mode === 'fit') {
      const maxWidth = canvas.width * 0.8
      const maxHeight = canvas.height * 0.8
      const fitScale = Math.min(maxWidth / textWidth, maxHeight / textHeight, 1)
      
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      ctx.scale(fitScale, fitScale)
      ctx.fillText(text, 0, 0)
    } else if (mode === 'fixed') {
      const pos = getPosition(position, canvas.width, canvas.height, textWidth, textHeight)
      
      ctx.translate(pos.x + textWidth / 2, pos.y + textHeight / 2)
      ctx.rotate(radians)
      ctx.fillText(text, 0, 0)
    }
  } else if (type === 'image' && imageWatermark) {
    const watermarkImg = await dataURLToImage(imageWatermark)
    
    const wmWidth = watermarkImg.width * scale
    const wmHeight = watermarkImg.height * scale

    if (mode === 'tile') {
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      
      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
      const cols = Math.ceil(diagonal / (wmWidth + spacing))
      const rows = Math.ceil(diagonal / (wmHeight + spacing))

      for (let row = -rows; row <= rows; row++) {
        for (let col = -cols; col <= cols; col++) {
          const x = col * (wmWidth + spacing) - wmWidth / 2
          const y = row * (wmHeight + spacing) - wmHeight / 2
          ctx.drawImage(watermarkImg, x, y, wmWidth, wmHeight)
        }
      }
    } else if (mode === 'fit') {
      const maxWidth = canvas.width * 0.8
      const maxHeight = canvas.height * 0.8
      const fitScale = Math.min(maxWidth / watermarkImg.width, maxHeight / watermarkImg.height, 1)
      const fitWidth = watermarkImg.width * fitScale
      const fitHeight = watermarkImg.height * fitScale
      
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      ctx.drawImage(watermarkImg, -fitWidth / 2, -fitHeight / 2, fitWidth, fitHeight)
    } else if (mode === 'fixed') {
      const pos = getPosition(position, canvas.width, canvas.height, wmWidth, wmHeight)
      
      ctx.translate(pos.x + wmWidth / 2, pos.y + wmHeight / 2)
      ctx.rotate(radians)
      ctx.drawImage(watermarkImg, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight)
    }
  }

  ctx.restore()

  const dataURL = canvasToDataURL(canvas)

  return {
    dataURL,
    type,
    mode,
    position,
    opacity
  }
}

function getPosition(position, canvasWidth, canvasHeight, elementWidth, elementHeight) {
  const margin = 20
  
  switch (position) {
    case 'top-left':
      return { x: margin, y: margin }
    case 'top-right':
      return { x: canvasWidth - elementWidth - margin, y: margin }
    case 'bottom-left':
      return { x: margin, y: canvasHeight - elementHeight - margin }
    case 'bottom-right':
      return { x: canvasWidth - elementWidth - margin, y: canvasHeight - elementHeight - margin }
    case 'center':
    default:
      return { x: (canvasWidth - elementWidth) / 2, y: (canvasHeight - elementHeight) / 2 }
  }
}
