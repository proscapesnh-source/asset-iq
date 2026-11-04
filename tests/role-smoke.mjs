import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

process.env.VITE_SUPABASE_URL ||= 'https://example.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= 'sb_publishable_mock'
globalThis.window = { navigator: globalThis.navigator, matchMedia: () => ({matches:false}) }
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
after(async () => { await vite.close() })
const { default: Dashboard } = await vite.ssrLoadModule('/src/components/Dashboard.jsx')
const { default: AppShell } = await vite.ssrLoadModule('/src/components/AppShell.jsx')
const { default: AssetsRegistry } = await vite.ssrLoadModule('/src/components/AssetsRegistry.jsx')
const mock = () => {}
const data = {assets:[{id:'a', name:'Sample',asset_tag:'TEST-1',status:'Good',health_score:95}], workOrders:[],inspections:[]}
const common = { data, onAddAsset:mock, onOpenAsset:mock, onInspect:mock, onWorkOrders:mock, onPlanning:mock, onSupervisor:mock, onAssetFilter:mock, onSiteSafety:mock, onProjects:mock, onTimeClock:mock }
function dashboard(role) {return renderToStaticMarkup(React.createElement(Dashboard,{...common,role}))}
function shell(role) {return renderToStaticMarkup(React.createElement(AppShell,{organizationName:'Test Org',userEmail:'test@example.com',role,active:'dashboard',onNavigate:mock,onSignOut:mock,children:React.createElement('div',null,'Test view')}))}
test('technician landing shows field actions and hides asset stats',()=>{
 const html=dashboard('technician')
 for (const label of ['My jobs','Clock in / out','Start inspection']) assert.ok(html.includes(label),label)
 assert.ok(html.includes('<details'))
 assert.ok(!html.includes('Fleet health'))
})
test('supervisor landing prioritizes crew and timesheets',()=>{
 const html=dashboard('supervisor')
 for(const label of ['Projects &amp; crews','Crew approvals','Timesheets']) assert.ok(html.includes(label),label)
 assert.ok(html.includes('Asset overview and planning'))
})
t...[truncated]