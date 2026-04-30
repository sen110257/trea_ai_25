import { imageToCanvas, canvasToDataURL } from './image'

export async function compressImage(img, options = {}) {
  const {
    quality = 0.8,
    maxWidth = null,
    maxHeight = null,
    format = 'image/jpeg'
  } = options

  let targetWidth = img.width
  let targetHeight = img.height

  if (maxWidth || maxHeight) {
    const ratio = img.width / img.height
    
    if (maxWidth && maxHeight) {
      if (ratio > maxWidth / maxHeight) {
        if (img.width > maxWidth) {
          targetWidth = maxWidth
          targetHeight = maxWidth / ratio
        }
      } else {
        if (img.height > maxHeight) {
          targetHeight = maxHeight
          targetWidth = maxHeight * ratio
        }
      }
    } else if (maxWidth && img.width > maxWidth) {
      targetWidth = maxWidth
      targetHeight = maxWidth / ratio
    } else if (maxHeight && img.height > maxHeight) {
      targetHeight = maxHeight
      targetWidth = maxHeight * ratio
    }
  }

  const canvas = imageToCanvas(img, Math.floor(targetWidth), Math.floor(targetHeight))
  const dataURL = canvasToDataURL(canvas, format, quality)
  
  return {
    dataURL,
    width: Math.floor(targetWidth),
    height: Math.floor(targetHeight),
    quality,
    format
  }
}

export function calculateCompressionSize(originalSize, quality) {
  const estimatedSize = originalSize * quality * 0.7
  return Math.floor(estimatedSize)
}
