import { useEffect, useState } from 'react'

function extensionFor(type = '') {
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('heic')) return 'heic'
  return 'jpg'
}

export default function PhotoSaveViewer() {
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const openPhoto = (event) => {
      const image = event.target.closest?.('.content img')
      if (!image || image.closest('.organization-logo-preview,.report-logo-v2')) return
      setPhoto({ src:image.currentSrc || image.src, alt:image.alt || 'PolyShield photo' })
      setMessage('')
    }
    document.addEventListener('click', openPhoto)
    return () => document.removeEventListener('click', openPhoto)
  }, [])

  const save = async () => {
    if (!photo?.src) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch(photo.src)
      if (!response.ok) throw new Error('Could not retrieve photo.')
      const blob = await response.blob()
      const file = new File([blob], `polyshield-photo-${Date.now()}.${extensionFor(blob.type)}`, { type:blob.type || 'image/jpeg' })
      if (navigator.share && navigator.canShare?.({ files:[file] })) {
        await navigator.share({ files:[file], title:'PolyShield photo' })
        setMessage('On iPhone, choose Save Image to place it in Photos.')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href=url; link.download=file.name; document.body.appendChild(link); link.click(); link.remove()
        window.setTimeout(()=>URL.revokeObjectURL(url),1500)
        setMessage('Photo downloaded to this device.')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Could not open the phone save menu. Press and hold the photo as a backup.')
    } finally { setBusy(false) }
  }

  if (!photo) return null
  return <div className="photo-save-backdrop" role="dialog" aria-modal="true" aria-label="Save PolyShield photo">
    <div className="photo-save-viewer">
      <button type="button" className="photo-save-close" aria-label="Close photo" onClick={()=>setPhoto(null)}>×</button>
      <img src={photo.src} alt={photo.alt}/>
      <div className="photo-save-actions"><button type="button" className="primary-button" disabled={busy} onClick={save}>{busy?'Preparing photo…':'Save to Phone'}</button><button type="button" className="secondary-button" onClick={()=>setPhoto(null)}>Close</button></div>
      <p>{message || 'On iPhone, tap Save to Phone and then choose Save Image.'}</p>
    </div>
  </div>
}
