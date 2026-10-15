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
  if (configured) {
    try {
      const configuredUrl = new URL(configured)
      const localHostnames = ['localhost', '127.0.0.1', '0.0.0.0']
      // Never send production email sign-in/reset links back to a developer's machine.
      if (!(localHostnames.includes(configuredUrl.hostname) && !localHostnames.includes(window.location.hostname))) {
        return configuredUrl.origin + configuredUrl.pathname.replace(/\/$/, '')
      }
    } catch {
      console.warn('VITE_APP_URL is invalid; using this app origin for auth links.')
    }
  }
  return window.location.origin
}

export function getAuthRedirectUrl() {
  const base = getAppBaseUrl()
  const linkedAssetId = getLinkedAssetId()
  const url = new URL(base)
  if (linkedAssetId) url.searchParams.set('asset', linkedAssetId)
  return url.toString()
}
