import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import AssetPassport from './components/AssetPassport'
import QuickInspection from './components/QuickInspection'
import Projects from './components/Projects'
import AddAssetWizard from './components/AddAssetWizard'
import { makeId } from './utils'
import { demoAssets, initialProjects, initialTimeline } from './data/demoData'

const load = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.warn(`Could not load ${key}`, error)
    return fallback
  }
}

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Could not save ${key}`, error)
    return false
  }
}

export default function App() {
  const initialAssetId = new URLSearchParams(window.location.search).get('asset')
  const initialAssets = load('asset-iq-assets', demoAssets)
  const safeInitialAssets = Array.isArray(initialAssets) && initialAssets.length ? initialAssets : demoAssets
  const hasDeepLink = Boolean(initialAssetId && safeInitialAssets.some((asset) => asset.id === initialAssetId))

  const [view, setView] = useState(hasDeepLink ? 'asset' : 'dashboard')
  const [assets, setAssets] = useState(safeInitialAssets)
  const [projects, setProjects] = useState(() => load('asset-iq-projects', initialProjects))
  const [timeline, setTimeline] = useState(() => load('asset-iq-timeline', initialTimeline))
  const [selectedAssetId, setSelectedAssetId] = useState(hasDeepLink ? initialAssetId : safeInitialAssets[0]?.id)
  const [toast, setToast] = useState('')

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null,
    [assets, selectedAssetId],
  )

  useEffect(() => { save('asset-iq-assets', assets) }, [assets])
  useEffect(() => { save('asset-iq-projects', projects) }, [projects])
  useEffect(() => { save('asset-iq-timeline', timeline) }, [timeline])

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const openAsset = (asset) => {
    if (!asset?.id) return
    setSelectedAssetId(asset.id)
    setView('asset')
    const url = new URL(window.location.href)
    url.searchParams.set('asset', asset.id)
    window.history.replaceState({}, '', url)
  }

  const startInspection = (asset = selectedAsset) => {
    if (!asset?.id) return
    setSelectedAssetId(asset.id)
    setView('inspect')
  }

  const updateAssetPhoto = (assetId, coverPhoto) => {
    setAssets((items) => items.map((asset) => asset.id === assetId ? { ...asset, coverPhoto } : asset))
    showToast('Asset photo updated.')
  }

  const createAsset = (asset) => {
    if (!asset?.id) {
      showToast('Asset could not be created.')
      return
    }

    const event = {
      id: makeId('EV'),
      assetId: asset.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'Asset Registration',
      title: 'Digital asset passport created',
      detail: `${asset.inspectionLevel || 'Baseline record'} created from onboarding evidence. Data confidence: ${asset.dataConfidence ?? 'Not scored'}%.`,
      source: 'Confirmed by user',
    }

    setAssets((items) => [asset, ...items.filter((item) => item.id !== asset.id)])
    setTimeline((items) => [event, ...items])
    setSelectedAssetId(asset.id)
    setView('asset')

    const url = new URL(window.location.href)
    url.searchParams.set('asset', asset.id)
    window.history.replaceState({}, '', url)
    showToast('Asset passport created.')
  }

  const completeInspection = (inspection) => {
    setTimeline((items) => [{
      id: makeId('EV'),
      assetId: inspection.assetId,
      date: new Date().toISOString().slice(0, 10),
      type: 'Inspection',
      title: `${inspection.condition} condition inspection completed`,
      detail: inspection.notes || `Action selected: ${inspection.action}. ${inspection.photos.length} photo(s) recorded.`,
      source: 'Inspector',
    }, ...items])
    setView('asset')
    showToast('Inspection saved to Asset History.')
  }

  const advanceProject = (projectId) => {
    setProjects((items) => items.map((project) => project.id === projectId ? {
      ...project,
      stageIndex: Math.min(project.stageIndex + 1, project.stages.length - 1),
      status: project.stageIndex + 1 >= project.stages.length - 1 ? 'Closed' : project.status,
    } : project))
    showToast('Project stage updated.')
  }

  const navigate = (next) => {
    if (next === 'assets') setView('dashboard')
    else if (next === 'inspect') startInspection()
    else setView(next)
  }

  let content
  if (view === 'add-asset') content = <AddAssetWizard onCancel={() => setView('dashboard')} onCreate={createAsset} />
  else if (view === 'asset' && selectedAsset) content = <AssetPassport asset={selectedAsset} timeline={timeline} onBack={() => { setView('dashboard'); window.history.replaceState({}, '', window.location.pathname) }} onStartInspection={startInspection} onUpdateAssetPhoto={updateAssetPhoto} />
  else if (view === 'inspect' && selectedAsset) content = <QuickInspection asset={selectedAsset} onBack={() => setView('dashboard')} onComplete={completeInspection} />
  else if (view === 'projects') content = <Projects projects={projects} assets={assets} onBack={() => setView('dashboard')} onAdvance={advanceProject} />
  else content = <Dashboard assets={assets} projects={projects} timeline={timeline} onOpenAsset={openAsset} onStartInspection={() => startInspection(assets[0])} onOpenProjects={() => setView('projects')} onAddAsset={() => setView('add-asset')} />

  const title = view === 'add-asset' ? 'Add Asset' : view === 'asset' ? 'Asset Passport' : view === 'inspect' ? 'Field Inspection' : view === 'projects' ? 'Projects' : 'Command Center'

  return (
    <AppShell title={title} activeView={view === 'asset' ? 'assets' : view} onNavigate={navigate}>
      {content}
      {toast ? <div className="toast">{toast}</div> : null}
    </AppShell>
  )
}
