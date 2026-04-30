export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function dataURLToImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataURL
  })
}

export function imageToCanvas(img, width = null, height = null) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  const targetWidth = width || img.width
  const targetHeight = height || img.height
  
  canvas.width = targetWidth
  canvas.height = targetHeight
  
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  return canvas
}

export function canvasToDataURL(canvas, type = 'image/png', quality = 0.92) {
  return canvas.toDataURL(type, quality)
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

export function dataURLToBlob(dataURL, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(resolve, type, quality)
    }
    img.src = dataURL
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function copyImageToClipboard(dataURL) {
  try {
    const response = await fetch(dataURL)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ])
    return true
  } catch (e) {
    console.error('Copy failed:', e)
    return false
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getImageFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const formatMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp'
  }
  return formatMap[ext] || 'image/png'
}

export function generateFilename(prefix = 'image', extension = 'png') {
  const timestamp = new Date().toISOString().slice(0, 10)
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${timestamp}_${random}.${extension}`
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
