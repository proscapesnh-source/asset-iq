import { useCallback, useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import AssetsRegistry from './components/AssetsRegistry'
import AddAssetForm from './components/AddAssetForm'
import InspectionForm from './components/InspectionForm'
import AssetDetail from './components/AssetDetail'
import WorkOrders from './components/WorkOrders'
import KnowledgeCenter from './components/KnowledgeCenter'
import SupervisorDashboard from './components/SupervisorDashboard'
import { supabase } from './lib/supabase'
import { addAssetPhoto, createAsset, createInspection, createWorkOrder, fetchAssetDetail, fetchAssets, fetchDashboard, fetchWorkOrders, loadContext, setCoverPhoto, updateWorkOrder, fetchKnowledgeBase, createKnowledgeRecord, deleteKnowledgeRecord, seedKnowledgeBase, saveAssetDNA, createAssetServiceEvent, updateAssetLifecycleStatus, createAssetLifecycleEvent, logActivity, createQRTagOrder, updateAsset, createAssetComponent, updateAssetComponent, deleteAssetComponent, retireAssetComponent, restoreAssetComponent } from './lib/data'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [context, setContext] = useState(null)
  const [view, setView] = useState('dashboard')
  const [assets, setAssets] = useState([])
  const [dashboard, setDashboard] = useState({ assets: [], workOrders: [], inspections: [] })
  const [workOrders, setWorkOrders] = useState([])
  const [knowledge, setKnowledge] = useState({ coatings: [], failures: [], repairs: [], standards: [] })
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assetDetail, setAssetDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fatalError, setFatalError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => { if (error) console.error(error); setSession(data.session || null) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])

  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  const refreshAll = useCallback(async (ctx = context) => {
    if (!ctx) return
    setLoading(true); setFatalError('')
    try {
      // Core asset data must never be hidden by an optional Knowledge Center problem.
      const [dash, allAssets, allWork] = await Promise.all([
        fetchDashboard(ctx.organizationId),
        fetchAssets(ctx.organizationId),
        fetchWorkOrders(ctx.organizationId),
      ])
      setDashboard(dash); setAssets(allAssets); setWorkOrders(allWork)

      try {
        const kb = await fetchKnowledgeBase(ctx.organizationId)
        setKnowledge(kb)
      } catch (knowledgeError) {
        console.warn('Knowledge Center unavailable:', knowledgeError)
        setKnowledge({ coatings: [], failures: [], repairs: [], standards: [] })
        setFatalError(`Core asset data loaded. Knowledge Center needs database migration v1.5: ${knowledgeError.message || 'permission error'}`)
      }
    } catch (error) {
      console.error(error)
      setFatalError(error.message || 'Could not load core asset data.')
    } finally { setLoading(false) }
  }, [context])

  useEffect(() => {
    if (!session) { setContext(null); return }
    let alive = true
    ;(async () => {
      try {
        const ctx = await loadContext()
        if (!alive) return
        setContext(ctx)
        await refreshAll(ctx)
        await logActivity(ctx.organizationId, ctx.user.id, 'session_started', `Signed in to PolyShield Asset IQ`, null, null, { email: ctx.user.email })
        const linkedAssetId = new URLSearchParams(window.location.search).get('asset')
        if (linkedAssetId) {
          try {
            const detail = await fetchAssetDetail(ctx.organizationId, linkedAssetId)
            if (alive) { setSelectedAsset(detail.asset); setAssetDetail(detail); setView('asset-detail') }
          } catch { /* Ignore invalid deep links */ }
        }
      } catch (error) { if (alive) setFatalError(`${error.message}. Make sure you ran supabase/setup.sql in the new Supabase project.`) }
    })()
    return () => { alive = false }
  }, [session])

  const navigate = (next) => {
    if (next === 'inspect' && !assets.length) { setView('add-asset'); return }
    setSelectedAsset(null); setAssetDetail(null); setView(next)
    const url = new URL(window.location.href); url.searchParams.delete('asset'); window.history.replaceState({}, '', url)
  }

  const openAsset = async (asset) => {
    setLoading(true)
    try {
      const detail = await fetchAssetDetail(context.organizationId, asset.id)
      setSelectedAsset(detail.asset); setAssetDetail(detail); setView('asset-detail')
      const url = new URL(window.location.href); url.searchParams.set('asset', asset.id); window.history.replaceState({}, '', url)
    } catch (error) { flash(error.message || 'Could not open asset.') }
    finally { setLoading(false) }
  }

  const refreshSelectedAsset = async () => {
    if (!selectedAsset) return
    const detail = await fetchAssetDetail(context.organizationId, selectedAsset.id)
    setSelectedAsset(detail.asset); setAssetDetail(detail)
  }

  if (session === undefined) return <div className="full-loading">Loading PolyShield Asset IQ…</div>
  if (!session) return <AuthScreen />

  if (fatalError && !context) return <main className="setup-error"><section><h1>Setup needed</h1><p>{fatalError}</p><button className="secondary-button" onClick={() => window.location.reload()}>Try again</button><button className="text-button" onClick={() => supabase.auth.signOut()}>Sign out</button></section></main>
  if (!context) return <div className="full-loading">Preparing your organization…</div>

  const active = view === 'asset-detail' || view === 'add-asset' || view === 'edit-asset' ? 'assets' : view

  return <AppShell organizationName={context.organizationName} userEmail={context.user.email} role={context.role} active={active} onNavigate={navigate} onSignOut={() => supabase.auth.signOut()}>
    {loading && <div className="loading-bar"/>}
    {fatalError && <div className="error-banner">{fatalError}<button onClick={() => refreshAll()}>Retry</button></div>}
    {view === 'dashboard' && <Dashboard data={dashboard} onAddAsset={() => setView('add-asset')} onOpenAsset={openAsset} onInspect={() => setView('inspect')} onWorkOrders={() => setView('work')} />}
    {view === 'assets' && <AssetsRegistry assets={assets} onAdd={() => setView('add-asset')} onOpen={openAsset} onInspect={(asset) => { setSelectedAsset(asset); setView('inspect') }} />}
    {view === 'add-asset' && <AddAssetForm onCancel={() => navigate('assets')} onSave={async (form, file) => { const asset = await createAsset(context.organizationId, form, file); await refreshAll(); flash('Asset created.'); await openAsset(asset) }} />}

    {view === 'edit-asset' && selectedAsset && <AddAssetForm mode="edit" initialValues={selectedAsset} currentCoverUrl={selectedAsset.cover_url || ''} onCancel={() => openAsset(selectedAsset)} onSave={async (form, file) => {
      const updates = {
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
        notes: form.notes.trim() || null,
      }
      const updated = await updateAsset(selectedAsset.id, updates)
      if (file) await addAssetPhoto(context.organizationId, selectedAsset.id, file, 'Asset cover photo', true)
      await logActivity(context.organizationId, context.user.id, 'asset_updated', `Asset record updated for ${updated.name}`, 'asset', updated.id, { asset_tag: updated.asset_tag })
      await refreshAll(); flash('Asset updated.'); await openAsset(updated)
    }} />}
    {view === 'inspect' && <InspectionForm knowledge={knowledge} asset={selectedAsset} assets={assets} onCancel={() => selectedAsset ? openAsset(selectedAsset) : navigate('dashboard')} onSave={async (asset, form, photos) => { const inspection = await createInspection({ organizationId: context.organizationId, userId: context.user.id, asset, form, photos }); await logActivity(context.organizationId, context.user.id, 'inspection_completed', `Inspection completed for ${asset.name}`, 'inspection', inspection.id, { asset_id: asset.id, condition: form.condition }); await refreshAll(); flash('Inspection saved to the asset record.'); await openAsset(asset) }} />}
    {view === 'asset-detail' && assetDetail && <AssetDetail detail={assetDetail} organizationName={context.organizationName} inspectorEmail={context.user.email} onBack={() => navigate('assets')} onInspect={(asset) => { setSelectedAsset(asset); setView('inspect') }} onEdit={(asset) => { setSelectedAsset(asset); setView('edit-asset') }} onAddPhoto={(file, caption, cover) => addAssetPhoto(context.organizationId, selectedAsset.id, file, caption, cover)} onSetCover={(photoId) => setCoverPhoto(selectedAsset.id, photoId)} onSaveDNA={(form) => saveAssetDNA(context.organizationId, selectedAsset.id, form)} onAddServiceEvent={(form) => createAssetServiceEvent(context.organizationId, selectedAsset.id, form)} onSaveLifecycleStatus={(status) => updateAssetLifecycleStatus(context.organizationId, selectedAsset.id, status)} onAddLifecycleEvent={(form) => createAssetLifecycleEvent(context.organizationId, selectedAsset.id, form)} onOrderQRTag={async (form) => { const order = await createQRTagOrder(context.organizationId, selectedAsset.id, context.user.id, form); await logActivity(context.organizationId, context.user.id, 'qr_tag_order_submitted', `QR tag order submitted for ${selectedAsset.name}`, 'asset', selectedAsset.id, { order_id: order.id, material: form.material, quantity: form.quantity }); flash('QR tag order submitted.'); return order }} onCreateComponent={async (form, photoFile) => { const item = await createAssetComponent(context.organizationId, selectedAsset.id, form, photoFile); await logActivity(context.organizationId, context.user.id, 'component_created', `Component added to ${selectedAsset.name}: ${item.name}`, 'asset', selectedAsset.id, { component_id: item.id }); flash('Component added.'); return item }} onUpdateComponent={async (id, form, photoFile, existingPhotoPath) => { const item = await updateAssetComponent(id, form, context.organizationId, selectedAsset.id, photoFile, existingPhotoPath); flash('Component updated.'); return item }} onDeleteComponent={async (id) => { await deleteAssetComponent(id); flash('Component permanently deleted.') }} onRetireComponent={async (id, reason) => { await retireAssetComponent(id, reason); flash('Component retired from service. History preserved.') }} onRestoreComponent={async (id) => { await restoreAssetComponent(id); flash('Component restored to active service.') }} onRefresh={async () => { await refreshSelectedAsset(); await refreshAll() }} />}
    {view === 'knowledge' && <KnowledgeCenter knowledge={knowledge} onCreate={async (library, record) => { await createKnowledgeRecord(context.organizationId, library, record); await refreshAll(); flash('Knowledge record saved.') }} onDelete={async (library, id) => { await deleteKnowledgeRecord(library, id); await refreshAll(); flash('Knowledge record removed.') }} onSeed={async (starter) => { await seedKnowledgeBase(context.organizationId, starter); await refreshAll(); flash('Starter inspection knowledge loaded.') }} />}
    {view === 'supervisor' && <SupervisorDashboard data={dashboard} role={context.role} />}
    {view === 'work' && <WorkOrders workOrders={workOrders} assets={assets} onCreate={async (form) => { await createWorkOrder(context.organizationId, form); await refreshAll(); flash('Work order created.') }} onUpdate={async (id, updates) => { await updateWorkOrder(id, updates); await refreshAll(); flash('Work order updated.') }} />}
    {toast && <div className="toast">{toast}</div>}
  </AppShell>
}
