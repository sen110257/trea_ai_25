import { imageToCanvas, canvasToDataURL } from './image'

export function cropImage(img, options = {}) {
  const {
    x = 0,
    y = 0,
    width = img.width,
    height = img.height,
    rotation = 0,
    flipX = false,
    flipY = false
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const radians = (rotation * Math.PI) / 180

  canvas.width = width
  canvas.height = height

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(radians)
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)
  ctx.drawImage(
    img,
    -x - width / 2,
    -y - height / 2
  )
  ctx.restore()

  const dataURL = canvasToDataURL(canvas)
  
  return {
    dataURL,
    x,
    y,
    width,
    height,
    rotation,
    flipX,
    flipY
  }
}

export function getAspectRatio(aspect) {
  const ratios = {
    'free': null,
    '1:1': 1,
    '4:3': 4/3,
    '16:9': 16/9,
    '3:2': 3/2,
    '2:3': 2/3,
    '9:16': 9/16
  }
  return ratios[aspect] || null
}

export function calculateCropBounds(imageWidth, imageHeight, aspectRatio, currentX, currentY, currentWidth, currentHeight) {
  if (!aspectRatio) {
    return { x: currentX, y: currentY, width: currentWidth, height: currentHeight }
  }

  let newWidth = currentWidth
  let newHeight = currentWidth / aspectRatio

  if (newHeight > currentHeight) {
    newHeight = currentHeight
    newWidth = currentHeight * aspectRatio
  }

  let newX = currentX + (currentWidth - newWidth) / 2
  let newY = currentY + (currentHeight - newHeight) / 2

  newX = Math.max(0, Math.min(newX, imageWidth - newWidth))
  newY = Math.max(0, Math.min(newY, imageHeight - newHeight))

  return {
    x: Math.floor(newX),
    y: Math.floor(newY),
    width: Math.floor(newWidth),
    height: Math.floor(newHeight)
  }
}
