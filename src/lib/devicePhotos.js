function safePhotoName(file, prefix = 'polyshield') {
  const extension = file.name?.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  return `${prefix}-${timestamp}${extension}`
}

export function saveCapturedPhotoToDevice(file, prefix) {
  if (!file || typeof document === 'undefined') return false
  try {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = safePhotoName(file, prefix)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    return true
  } catch (error) {
    console.warn('Photo could not be saved to this device:', error)
    return false
  }
}
