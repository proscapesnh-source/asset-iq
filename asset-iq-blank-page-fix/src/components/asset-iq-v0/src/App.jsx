import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import AssetPassport from './components/AssetPassport'
import QuickInspection from './components/QuickInspection'
import Projects from './components/Projects'
import AddAssetWizard from './components/AddAssetWizard'
import RepairRecord from './components/RepairRecord'
import { makeId, normalizeAsset, safeLoad, safeSave } from './utils'
import { demoAssets, initialProjects, initialTimeline } from './data/demoData'

const normalizedDemoAssets = demoAssets.map(normalizeAsset)

export default function App() {
  const initialAssetId = new URLSearchParams(window.location.search).get('asset')
  const loadedAssets = safeLoad('asset-iq-assets', normalizedDemoAssets)
  const initialAssets = (Array.isArray(loadedAssets) && loadedAssets.length ? loadedAssets : normalizedDemoAssets).map(normalizeAsset)
  const hasDeepLink = Boolean(initialAssetId && initialAssets.some((asset) => asset.id === initialAssetId))

  const [view, setView] = useState(hasDeepLink ? 'asset' : 'dashboard')
  const [assets, setAssets] = useState(initialAssets)
  const [projects, setProjects] = useState(() => safeLoad('asset-iq-projects', initialProjects))
  const [timeline, setTimeline] = useState(() => safeLoad('asset-iq-timeline', initialTimeline))
  const [repairs, setRepairs] = useState(() => safeLoad('asset-iq-repairs', []))
  const [selectedAssetId, setSelectedAssetId] = useState(hasDeepLink ? initialAssetId : initialAssets[0]?.id)
  const [toast, setToast] = useState('')

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || assets[0] || null,
    [assets, selectedAssetId],
  )

  useEffect(() => { if (!safeSave('asset-iq-assets', assets)) showToast('Storage is full. Remove large photos or connect cloud storage.') }, [assets])
  useEffect(() => { safeSave('asset-iq-projects', projects) }, [projects])
  useEffect(() => { safeSave('asset-iq-timeline', timeline) }, [timeline])
  useEffect(() => { safeSave('asset-iq-repairs', repairs) }, [repairs])

  const showToast = (message) => {
    setToast(message)
    window.clearTimeout(showToast.timer)
    showToast.timer = window.setTimeout(() => setToast(''), 2800)
  }

  const updateUrl = (assetId) => {
    const url = new URL(window.location.href)
    if (assetId) url.searchParams.set('asset', assetId)
    else url.searchParams.delete('asset')
    window.history.replaceState({}, '', url)
  }

  const openAsset = (asset) => {
    if (!asset?.id) return
    setSelectedAssetId(asset.id)
    setView('asset')
    updateUrl(asset.id)
  }

  const startInspection = (asset = selectedAsset) => {
    if (!asset?.id) return showToast('Create or select an asset first.')
    setSelectedAssetId(asset.id)
    setView('inspect')
  }

  const updateAssetPhoto = (assetId, coverPhoto) => {
    setAssets((items) => items.map((asset) => asset.id === assetId ? { ...asset, coverPhoto } : asset))
    showToast('Asset photo updated.')
  }

  const createAsset = (rawAsset) => {
    const asset = normalizeAsset(rawAsset)
    setAssets((items) => [asset, ...items.filter((item) => item.id !== asset.id)])
    setTimeline((items) => [{
      id: makeId('EV'), assetId: asset.id, date: new Date().toISOString().slice(0, 10),
      type: 'Asset Registration', title: 'Digital asset passport created',
      detail: `${asset.inspectionLevel} created. Data confidence: ${asset.dataConfidence}%.`, source: 'Confirmed by user',
    }, ...items])
    setSelectedAssetId(asset.id)
    setView('asset')
    updateUrl(asset.id)
    showToast('Asset passport created.')
  }

  const completeInspection = (inspection) => {
    if (!inspection?.assetId) return showToast('Inspection could not be linked to an asset.')
    setTimeline((items) => [{
      id: makeId('EV'), assetId: inspection.assetId, date: new Date().toISOString().slice(0, 10),
      type: 'Inspection', title: `${inspection.condition} condition inspection completed`,
      detail: inspection.notes || `Action: ${inspection.action}. ${inspection.photos?.length || 0} photo(s) recorded.`, source: 'Inspector',
      record: inspection,
    }, ...items])
    setSelectedAssetId(inspection.assetId)
    setView('asset')
    showToast('Inspection saved to asset history.')
  }

  const saveRepair = (repair) => {
    setRepairs((items) => [repair, ...items])
    setTimeline((items) => [{
      id: makeId('EV'), assetId: repair.assetId, date: repair.date, type: 'Repair',
      title: repair.title, detail: `${repair.status} · ${repair.repairType}. Contractor: ${repair.contractor || 'Not recorded'}.`,
      source: repair.verification ? `Verified by ${repair.verification}` : 'Repair record', record: repair,
    }, ...items])
    setSelectedAssetId(repair.assetId)
    setView('asset')
    showToast('Repair record saved to permanent history.')
  }

  const advanceProject = (projectId) => {
    setProjects((items) => items.map((project) => project.id === projectId ? {
      ...project,
      stageIndex: Math.min(project.stageIndex + 1, project.stages.length - 1),
      status: project.stageIndex + 1 >= project.stages.length - 1 ? 'Closed' : project.status,
    } : project))
    showToast('Project stage updated.')
  }

  const goDashboard = () => { setView('dashboard'); updateUrl(null) }
  const navigate = (next) => {
    if (next === 'assets' || next === 'dashboard') goDashboard()
    else if (next === 'inspect') startInspection()
    else setView(next)
  }

  let content
  if (view === 'add-asset') content = <AddAssetWizard onCancel={goDashboard} onCreate={createAsset} />
  else if (view === 'asset' && selectedAsset) content = <AssetPassport asset={selectedAsset} timeline={timeline} repairs={repairs} onBack={goDashboard} onStartInspection={startInspection} onStartRepair={() => setView('repair')} onUpdateAssetPhoto={updateAssetPhoto} />
  else if (view === 'inspect' && selectedAsset) content = <QuickInspection asset={selectedAsset} onBack={() => setView('asset')} onComplete={completeInspection} />
  else if (view === 'repair' && selectedAsset) content = <RepairRecord asset={selectedAsset} onBack={() => setView('asset')} onSave={saveRepair} />
  else if (view === 'projects') content = <Projects projects={projects} assets={assets} onBack={goDashboard} onAdvance={advanceProject} />
  else content = <Dashboard assets={assets} projects={projects} timeline={timeline} onOpenAsset={openAsset} onStartInspection={() => startInspection(assets[0])} onOpenProjects={() => setView('projects')} onAddAsset={() => setView('add-asset')} />

  const title = view === 'add-asset' ? 'Add Asset' : view === 'asset' ? 'Asset Passport' : view === 'inspect' ? 'Field Inspection' : view === 'repair' ? 'Repair Record' : view === 'projects' ? 'Projects' : 'Command Center'

  return <AppShell title={title} activeView={view === 'asset' || view === 'repair' ? 'assets' : view} onNavigate={navigate}>
    {content}
    {toast ? <div className="toast">{toast}</div> : null}
  </AppShell>
}
