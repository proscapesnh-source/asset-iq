const PENDING_ASSET_KEY = 'polyshield:pending-asset'

export function getLinkedAssetId() {
  const assetId = new URLSearchParams(window.location.search).get('asset')
  if (assetId) {
    try { localStorage.setItem(PENDING_ASSET_KEY, assetId) } catch {}
    return assetId
  }
  try { return localStorage.getItem(PENDING_ASSET_KEY) || '' } catch { return '' }
}

export function clearPendingAsset() {
  try { localStorage.removeItem(PENDING_ASSET_KEY) } catch {}
}

export function getAppBaseUrl() {
  const configured = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '')
  if (configured) return configured
  return window.location.origin
}

export function getAuthRedirectUrl() {
  const base = getAppBaseUrl()
  const linkedAssetId = getLinkedAssetId()
  const url = new URL(base)
  if (linkedAssetId) url.searchParams.set('asset', linkedAssetId)
  return url.toString()
}
