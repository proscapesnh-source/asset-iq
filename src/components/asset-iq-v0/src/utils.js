export function makeId(prefix = 'ID') {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomPart}`
}

export function safeLoad(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Could not save ${key}`, error)
    return false
  }
}

export function normalizeAsset(asset = {}) {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: asset.id || makeId('AIQ'),
    name: asset.name || 'Unnamed Asset',
    type: asset.type || 'Other',
    contents: asset.contents || 'Not recorded',
    location: asset.location || 'Not recorded',
    facility: asset.facility || 'Not recorded',
    substrate: asset.substrate || 'Unknown',
    capacity: asset.capacity || 'Not recorded',
    manufacturer: asset.manufacturer || 'Not recorded',
    model: asset.model || 'Not recorded',
    serialNumber: asset.serialNumber || 'Not recorded',
    installedYear: asset.installedYear || 'Unknown',
    assetHealth: Number.isFinite(asset.assetHealth) ? asset.assetHealth : 80,
    serviceHealth: Number.isFinite(asset.serviceHealth) ? asset.serviceHealth : 80,
    dataConfidence: Number.isFinite(asset.dataConfidence) ? asset.dataConfidence : 40,
    inspectionLevel: asset.inspectionLevel || 'External baseline',
    status: asset.status || 'Monitor',
    coverPhoto: asset.coverPhoto || '',
    nameplatePhoto: asset.nameplatePhoto || '',
    components: Array.isArray(asset.components) ? asset.components : [],
    currentCycle: {
      number: asset.currentCycle?.number || 1,
      startedOn: asset.currentCycle?.startedOn || today,
      firstServiceDate: asset.currentCycle?.firstServiceDate || today,
      linerPresent: Boolean(asset.currentCycle?.linerPresent),
      linerType: asset.currentCycle?.linerType || null,
    },
    nextInspection: asset.nextInspection || 'Schedule required',
  }
}

export function compressImage(file, { maxWidth = 1400, quality = 0.78 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('')
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read image'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Unable to process image'))
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}
