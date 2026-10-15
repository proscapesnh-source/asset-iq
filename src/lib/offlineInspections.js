const DB_NAME = 'polyshield-field'
const DB_VERSION = 1
const STORE = 'pending-inspections'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transaction(mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  }))
}

export async function queueInspection({ organizationId, userId, asset, form, photos }) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const record = { id, organizationId, userId, asset, form, queuedAt: new Date().toISOString(), photos: photos.map(({ file, url, ai_busy, ai_error, ...photo }) => ({ ...photo, file })) }
  await transaction('readwrite', (store) => store.put(record))
  return record
}

export const listQueuedInspections = () => transaction('readonly', (store) => store.getAll())
export const removeQueuedInspection = (id) => transaction('readwrite', (store) => store.delete(id))

export async function syncQueuedInspections(createInspection) {
  const queued = await listQueuedInspections()
  if (!navigator.onLine) return { synced: 0, remaining: queued.length }
  let synced = 0
  for (const item of queued) {
    try {
      await createInspection({ ...item, clientSubmissionId: item.id })
      await removeQueuedInspection(item.id)
      synced += 1
    } catch (error) {
      console.warn('Pending inspection sync failed:', error)
      break
    }
  }
  return { synced, remaining: (await listQueuedInspections()).length }
}
