import { STORAGE_BUCKET, supabase } from './supabase'
import { randomId } from './id'

const signedUrlCache = new Map()

export function healthFromCondition(condition) {
  return { Excellent: 95, Good: 85, Fair: 65, Poor: 35, Critical: 15 }[condition] ?? 70
}

export function statusFromHealth(score) {
  if (score >= 80) return 'Good'
  if (score >= 55) return 'Monitor'
  if (score >= 30) return 'Repair'
  return 'Critical'
}

export function formatDate(value) {
  if (!value) return 'Not scheduled'
  const date = new Date(`${value}`.length === 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function getSignedUrl(path) {
  if (!path) return null
  const cached = signedUrlCache.get(path)
  if (cached && cached.expires > Date.now()) return cached.url

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60)
  if (error) {
    console.warn('Could not sign image URL:', error.message)
    return null
  }

  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}

export async function uploadImage(file, organizationId, folder) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 70) || 'photo'
  const path = `${organizationId}/${folder}/${randomId()}-${safeBase}.${extension}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return path
}

export async function bootstrapOrganization(user) {
  const companyName = user?.user_metadata?.company_name || 'My Organization'
  const { data, error } = await supabase.rpc('bootstrap_my_organization', { organization_name: companyName })
  if (error) throw error
  return data
}

export async function loadContext() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('No signed-in user.')

  await bootstrapOrganization(user)

  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (error) throw error

  return {
    user,
    organizationId: membership.organization_id,
    organizationName: membership.organizations?.name || 'Organization',
    role: membership.role,
  }
}

export async function fetchAssets(organizationId) {
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!assets?.length) return []

  const ids = assets.map((asset) => asset.id)
  const { data: photos, error: photoError } = await supabase
    .from('asset_photos')
    .select('id, asset_id, storage_path, caption, is_cover, created_at')
    .in('asset_id', ids)
    .order('created_at', { ascending: false })
  if (photoError) throw photoError

  const [dnaResult, eventsResult] = await Promise.all([
    supabase.from('asset_dna').select('*').in('asset_id', ids),
    supabase.from('asset_service_events').select('*').in('asset_id', ids).order('event_date', { ascending: false }),
  ])
  if (dnaResult.error) throw dnaResult.error
  if (eventsResult.error) throw eventsResult.error

  const photoMap = new Map(), dnaMap = new Map(), eventMap = new Map()
  for (const photo of photos || []) {
    if (!photoMap.has(photo.asset_id)) photoMap.set(photo.asset_id, [])
    photoMap.get(photo.asset_id).push(photo)
  }
  for (const dna of dnaResult.data || []) dnaMap.set(dna.asset_id, dna)
  for (const event of eventsResult.data || []) {
    if (!eventMap.has(event.asset_id)) eventMap.set(event.asset_id, [])
    eventMap.get(event.asset_id).push(event)
  }

  return Promise.all(assets.map(async (asset) => {
    const assetPhotos = photoMap.get(asset.id) || []
    const cover = assetPhotos.find((photo) => photo.is_cover) || assetPhotos[0]
    const cover_url = cover ? await getSignedUrl(cover.storage_path) : null
    return { ...asset, cover_url, photos: assetPhotos, dna: dnaMap.get(asset.id) || null, service_events: eventMap.get(asset.id) || [] }
  }))
}

export async function createAsset(organizationId, form, coverFile) {
  const { data: asset, error } = await supabase
    .from('assets')
    .insert({
      organization_id: organizationId,
      asset_tag: form.asset_tag.trim(),
      name: form.name.trim(),
      asset_type: form.asset_type,
      facility: form.facility.trim() || null,
      location: form.location.trim() || null,
      contents: form.contents.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      install_date: form.install_date || null,
      next_inspection_date: form.next_inspection_date || null,
      health_score: 85,
      status: 'Good',
      notes: form.notes.trim() || null,
    })
    .select('*')
    .single()
  if (error) throw error

  if (coverFile) {
    try {
      const storagePath = await uploadImage(coverFile, organizationId, `assets/${asset.id}`)
      const { error: photoError } = await supabase.from('asset_photos').insert({
        organization_id: organizationId,
        asset_id: asset.id,
        storage_path: storagePath,
        file_name: coverFile.name,
        caption: 'Asset cover photo',
        is_cover: true,
      })
      if (photoError) throw photoError
    } catch (uploadError) {
      console.warn('Asset created, but cover photo failed:', uploadError)
    }
  }

  return asset
}

export async function updateAsset(assetId, updates) {
  const { data, error } = await supabase.from('assets').update(updates).eq('id', assetId).select('*').single()
  if (error) throw error
  return data
}

export async function addAssetPhoto(organizationId, assetId, file, caption = '', makeCover = false) {
  const storagePath = await uploadImage(file, organizationId, `assets/${assetId}`)
  if (makeCover) {
    const { error: clearError } = await supabase.from('asset_photos').update({ is_cover: false }).eq('asset_id', assetId)
    if (clearError) throw clearError
  }
  const { data, error } = await supabase.from('asset_photos').insert({
    organization_id: organizationId,
    asset_id: assetId,
    storage_path: storagePath,
    file_name: file.name,
    caption: caption || null,
    is_cover: makeCover,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function setCoverPhoto(assetId, photoId) {
  const { error: clearError } = await supabase.from('asset_photos').update({ is_cover: false }).eq('asset_id', assetId)
  if (clearError) throw clearError
  const { error } = await supabase.from('asset_photos').update({ is_cover: true }).eq('id', photoId)
  if (error) throw error
}

export async function fetchAssetDetail(organizationId, assetId) {
  const [assetResult, inspectionsResult, workOrdersResult, photosResult, dnaResult, eventsResult, lifecycleResult] = await Promise.all([
    supabase.from('assets').select('*').eq('organization_id', organizationId).eq('id', assetId).single(),
    supabase.from('inspections').select('*').eq('asset_id', assetId).order('inspected_at', { ascending: false }),
    supabase.from('work_orders').select('*').eq('asset_id', assetId).order('created_at', { ascending: false }),
    supabase.from('asset_photos').select('*').eq('asset_id', assetId).order('created_at', { ascending: false }),
    supabase.from('asset_dna').select('*').eq('asset_id', assetId).maybeSingle(),
    supabase.from('asset_service_events').select('*').eq('asset_id', assetId).order('event_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('asset_lifecycle_events').select('*').eq('asset_id', assetId).order('event_date', { ascending: false }).order('created_at', { ascending: false }),
  ])

  for (const result of [assetResult, inspectionsResult, workOrdersResult, photosResult, dnaResult, eventsResult, lifecycleResult]) {
    if (result.error) throw result.error
  }

  let components = []
  let componentsReady = true
  try {
    const componentResult = await supabase.from('asset_components').select('*').eq('asset_id', assetId).order('created_at', { ascending: true })
    if (componentResult.error) throw componentResult.error
    components = componentResult.data || []
    components = await Promise.all(components.map(async (component) => ({
      ...component,
      photo_url: component.photo_storage_path ? await getSignedUrl(component.photo_storage_path) : null,
    })))
  } catch (componentError) {
    componentsReady = false
    console.warn('Asset components unavailable until v2.0 migration is installed:', componentError.message)
  }

  const photos = await Promise.all((photosResult.data || []).map(async (photo) => ({ ...photo, url: await getSignedUrl(photo.storage_path) })))

  const inspectionIds = (inspectionsResult.data || []).map((item) => item.id)
  let inspectionPhotos = []
  if (inspectionIds.length) {
    const { data, error } = await supabase.from('inspection_photos').select('*').in('inspection_id', inspectionIds).order('created_at', { ascending: true })
    if (error) throw error
    inspectionPhotos = await Promise.all((data || []).map(async (photo) => ({ ...photo, url: await getSignedUrl(photo.storage_path) })))
  }

  const byInspection = new Map()
  for (const photo of inspectionPhotos) {
    if (!byInspection.has(photo.inspection_id)) byInspection.set(photo.inspection_id, [])
    byInspection.get(photo.inspection_id).push(photo)
  }

  const inspections = (inspectionsResult.data || []).map((inspection) => ({ ...inspection, photos: byInspection.get(inspection.id) || [] }))
  const cover = photos.find((photo) => photo.is_cover) || photos[0]

  return {
    asset: { ...assetResult.data, cover_url: cover?.url || null, dna: dnaResult.data || null, service_events: eventsResult.data || [] },
    dna: dnaResult.data || null,
    serviceEvents: eventsResult.data || [],
    lifecycleEvents: lifecycleResult.data || [],
    photos,
    inspections,
    workOrders: workOrdersResult.data || [],
    components,
    componentsReady,
  }
}

export async function saveAssetDNA(organizationId, assetId, form) {
  const allowed = ['record_mode','construction_material','capacity','design_pressure','design_temperature','service_environment','original_coating_family','original_coating_manufacturer','original_coating_product','original_coating_date','original_dft','original_surface_prep','current_coating_family','current_coating_manufacturer','current_coating_product','current_coating_date','current_dft','current_surface_prep','coating_record_status','construction_record_status','baseline_date','baseline_notes','lifecycle_status']
  const payload = { organization_id: organizationId, asset_id: assetId }
  for (const key of allowed) payload[key] = form[key] === '' ? null : form[key]
  const { data, error } = await supabase.from('asset_dna').upsert(payload, { onConflict: 'asset_id' }).select('*').single()
  if (error) throw error
  return data
}

export async function createAssetServiceEvent(organizationId, assetId, form) {
  const payload = { ...form, organization_id: organizationId, asset_id: assetId }
  for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null
  const { data, error } = await supabase.from('asset_service_events').insert(payload).select('*').single()
  if (error) throw error
  if (form.establishes_baseline) {
    const dnaPatch = {
      organization_id: organizationId, asset_id: assetId, record_mode: 'Rehabilitated Baseline', baseline_date: form.event_date,
      coating_record_status: form.source_status || 'Documented', current_coating_family: form.coating_family || null, current_coating_manufacturer: form.manufacturer || null,
      current_coating_product: form.product_name || null, current_coating_date: form.event_date || null, current_dft: form.dft || null, current_surface_prep: form.surface_prep || null,
      baseline_notes: form.notes || `Baseline established by ${form.event_type}.`
    }
    const { error: dnaError } = await supabase.from('asset_dna').upsert(dnaPatch, { onConflict: 'asset_id' })
    if (dnaError) throw dnaError
  }
  return data
}

export async function updateAssetLifecycleStatus(organizationId, assetId, status) {
  const { data, error } = await supabase.from('asset_dna').upsert({ organization_id: organizationId, asset_id: assetId, lifecycle_status: status }, { onConflict: 'asset_id' }).select('*').single()
  if (error) throw error
  return data
}

export async function createAssetLifecycleEvent(organizationId, assetId, form) {
  const payload = { ...form, organization_id: organizationId, asset_id: assetId }
  for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null
  const { data, error } = await supabase.from('asset_lifecycle_events').insert(payload).select('*').single()
  if (error) throw error
  if (form.lifecycle_status) await updateAssetLifecycleStatus(organizationId, assetId, form.lifecycle_status)
  return data
}

export async function createInspection({ organizationId, userId, asset, form, photos }) {
  const healthScore = healthFromCondition(form.condition)
  const status = statusFromHealth(healthScore)

  const { data: inspection, error } = await supabase.from('inspections').insert({
    organization_id: organizationId,
    asset_id: asset.id,
    inspector_id: userId,
    inspected_at: new Date().toISOString(),
    condition: form.condition,
    liner_present: form.liner_present,
    action_required: form.action_required,
    notes: form.notes.trim() || null,
    health_score: healthScore,
  }).select('*').single()
  if (error) throw error

  for (const item of photos) {
    const storagePath = await uploadImage(item.file, organizationId, `inspections/${inspection.id}`)
    const { error: photoError } = await supabase.from('inspection_photos').insert({
      organization_id: organizationId,
      inspection_id: inspection.id,
      asset_id: asset.id,
      storage_path: storagePath,
      file_name: item.file.name,
      title: item.title.trim() || item.file.name,
      category: item.category,
      notes: item.notes.trim() || null,
      annotation_note: item.annotation_note.trim() || null,
    })
    if (photoError) throw photoError
  }

  const { error: assetUpdateError } = await supabase.from('assets').update({
    health_score: healthScore,
    status,
    last_inspection_date: new Date().toISOString().slice(0, 10),
    next_inspection_date: form.next_inspection_date || asset.next_inspection_date || null,
  }).eq('id', asset.id)
  if (assetUpdateError) throw assetUpdateError

  if (form.action_required === 'Repair' || form.action_required === 'Engineering Review') {
    const priority = form.action_required === 'Engineering Review' ? 'Critical' : form.condition === 'Poor' ? 'High' : 'Medium'
    const { error: workError } = await supabase.from('work_orders').insert({
      organization_id: organizationId,
      asset_id: asset.id,
      inspection_id: inspection.id,
      title: `${form.action_required}: ${asset.name}`,
      description: form.notes.trim() || `Created automatically from ${form.condition.toLowerCase()} inspection condition.`,
      priority,
      status: 'Open',
    })
    if (workError) throw workError
  }

  return inspection
}

export async function fetchWorkOrders(organizationId) {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*, assets(name, asset_tag)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createWorkOrder(organizationId, form) {
  const { data, error } = await supabase.from('work_orders').insert({
    organization_id: organizationId,
    asset_id: form.asset_id,
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    status: 'Open',
    due_date: form.due_date || null,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updateWorkOrder(workOrderId, updates) {
  const payload = { ...updates }
  if (updates.status === 'Complete') payload.completed_at = new Date().toISOString()
  const { data, error } = await supabase.from('work_orders').update(payload).eq('id', workOrderId).select('*').single()
  if (error) throw error
  return data
}

export async function fetchDashboard(organizationId) {
  const [assets, workOrders, inspections] = await Promise.all([
    fetchAssets(organizationId),
    fetchWorkOrders(organizationId),
    supabase.from('inspections').select('id, asset_id, inspected_at, condition, health_score, assets(name, asset_tag)').eq('organization_id', organizationId).order('inspected_at', { ascending: false }).limit(8),
  ])
  if (inspections.error) throw inspections.error
  let activity = []
  try { activity = await fetchActivity(organizationId, 50) } catch (error) { console.warn('Activity unavailable:', error.message) }
  return { assets, workOrders, inspections: inspections.data || [], activity }
}

const KNOWLEDGE_TABLES = {
  coatings: 'coating_systems',
  failures: 'failure_modes',
  repairs: 'repair_methods',
  standards: 'inspection_standards',
}

export async function fetchKnowledgeBase(organizationId) {
  const entries = await Promise.all(Object.entries(KNOWLEDGE_TABLES).map(async ([key, table]) => {
    const { data, error } = await supabase.from(table).select('*').eq('organization_id', organizationId).order('created_at', { ascending: false })
    if (error) {
      if (error.code === '42P01' || /does not exist/i.test(error.message || '')) return [key, []]
      if (error.code === '42501' || /permission denied/i.test(error.message || '')) {
        throw new Error(`Permission denied for ${table}. Run supabase/migrations/20260807_v1_5_database_foundation.sql`)
      }
      throw error
    }
    return [key, data || []]
  }))
  return Object.fromEntries(entries)
}

export async function createKnowledgeRecord(organizationId, library, record) {
  const table = KNOWLEDGE_TABLES[library]
  if (!table) throw new Error('Unknown knowledge library.')
  const payload = Object.fromEntries(Object.entries(record).filter(([, value]) => value !== ''))
  const { data, error } = await supabase.from(table).insert({ organization_id: organizationId, ...payload }).select('*').single()
  if (error) throw error
  return data
}

export async function deleteKnowledgeRecord(library, id) {
  const table = KNOWLEDGE_TABLES[library]
  if (!table) throw new Error('Unknown knowledge library.')
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function seedKnowledgeBase(organizationId, starter) {
  for (const [library, rows] of Object.entries(starter || {})) {
    const table = KNOWLEDGE_TABLES[library]
    if (!table || !rows?.length) continue
    const { error } = await supabase.from(table).insert(rows.map((row) => ({ organization_id: organizationId, ...row })))
    if (error) throw error
  }
}

export async function logActivity(organizationId, userId, eventType, summary, entityType = null, entityId = null, metadata = {}) {
  const { error } = await supabase.from('activity_log').insert({ organization_id: organizationId, user_id: userId, event_type: eventType, entity_type: entityType, entity_id: entityId, summary, metadata })
  if (error && error.code !== '42P01') console.warn('Activity log:', error.message)
}

export async function fetchActivity(organizationId, limit = 50) {
  const { data, error } = await supabase.from('activity_log').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(limit)
  if (error) { if (error.code === '42P01' || error.code === '42501') return []; throw error }
  return data || []
}


export async function createQRTagOrder(organizationId, assetId, userId, form) {
  const payload = {
    organization_id: organizationId,
    asset_id: assetId,
    requested_by: userId,
    material: form.material,
    tag_size: form.size,
    quantity: Math.max(1, Number(form.quantity) || 1),
    include_asset_name: form.include_asset_name !== false,
    include_organization_name: form.include_organization_name !== false,
    asset_name_snapshot: form.asset_name || null,
    asset_tag_snapshot: form.asset_tag || null,
    qr_url: form.qr_url,
    notes: form.notes?.trim() || null,
    status: 'Submitted',
  }
  const { data, error } = await supabase.from('qr_tag_orders').insert(payload).select('*').single()
  if (error) throw error
  return data
}


export async function createAssetComponent(organizationId, assetId, form, photoFile = null) {
  const condition = form.condition === 'Unknown' ? 'Good' : (form.condition || 'Good')
  const healthScore = healthFromCondition(condition)
  const photoStoragePath = photoFile ? await uploadImage(photoFile, organizationId, `assets/${assetId}/components`) : null
  const { data, error } = await supabase.from('asset_components').insert({
    organization_id:organizationId, asset_id:assetId,
    component_tag:form.component_tag?.trim()||null, name:form.name.trim(),
    component_type:form.component_type||'Other', location:form.location?.trim()||null,
    manufacturer:form.manufacturer?.trim()||null, model:form.model?.trim()||null,
    serial_number:form.serial_number?.trim()||null, condition, health_score:healthScore,
    status:statusFromHealth(healthScore), notes:form.notes?.trim()||null,
    photo_storage_path:photoStoragePath,
    ai_confidence:Number.isFinite(Number(form.ai_confidence))?Number(form.ai_confidence):null,
    ai_identified:Boolean(form.ai_identified),
    ai_visible_text:Array.isArray(form.ai_visible_text)?form.ai_visible_text:[],
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updateAssetComponent(componentId, form, organizationId = null, assetId = null, photoFile = null, existingPhotoPath = null) {
  const condition = form.condition === 'Unknown' ? 'Good' : (form.condition || 'Good')
  const healthScore = healthFromCondition(condition)
  let photoStoragePath = existingPhotoPath || null
  if (photoFile && organizationId && assetId) photoStoragePath = await uploadImage(photoFile, organizationId, `assets/${assetId}/components`)
  const { data, error } = await supabase.from('asset_components').update({
    component_tag:form.component_tag?.trim()||null, name:form.name.trim(),
    component_type:form.component_type||'Other', location:form.location?.trim()||null,
    manufacturer:form.manufacturer?.trim()||null, model:form.model?.trim()||null,
    serial_number:form.serial_number?.trim()||null, condition, health_score:healthScore,
    status:statusFromHealth(healthScore), notes:form.notes?.trim()||null,
    photo_storage_path:photoStoragePath,
    ai_confidence:Number.isFinite(Number(form.ai_confidence))?Number(form.ai_confidence):null,
    ai_identified:Boolean(form.ai_identified),
    ai_visible_text:Array.isArray(form.ai_visible_text)?form.ai_visible_text:[],
    updated_at:new Date().toISOString(),
  }).eq('id',componentId).select('*').single()
  if (error) throw error
  return data
}

export async function deleteAssetComponent(componentId) {
  const { error } = await supabase.from('asset_components').delete().eq('id', componentId)
  if (error) throw error
}


export async function retireAssetComponent(componentId, reason = '') {
  const { data, error } = await supabase.from('asset_components').update({
    lifecycle_status: 'retired',
    removed_at: new Date().toISOString(),
    removal_reason: reason?.trim() || 'Replaced / removed from service',
    updated_at: new Date().toISOString(),
  }).eq('id', componentId).select('*').single()
  if (error) throw error
  return data
}

export async function restoreAssetComponent(componentId) {
  const { data, error } = await supabase.from('asset_components').update({
    lifecycle_status: 'active',
    removed_at: null,
    removal_reason: null,
    updated_at: new Date().toISOString(),
  }).eq('id', componentId).select('*').single()
  if (error) throw error
  return data
}
