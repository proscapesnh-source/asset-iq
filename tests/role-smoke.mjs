import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import React from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { createServer } from 'vite'

process.env.VITE_SUPABASE_URL ||= 'https://example.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= 'sb_publishable_mock'
globalThis.window = { navigator: globalThis.navigator, matchMedia: () => ({matches:false}) }
const vite = await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'})
after(()=>vite.close())
const {default:Dashboard}=await vite.ssrLoadModule('/src/components/Dashboard.jsx')
const {default:AppShell}=await vite.ssrLoadModule('/src/components/AppShell.jsx')
const {default:AssetsRegistry}=await vite.ssrLoadModule('/src/components/AssetsRegistry.jsx')
const noop=()=>{}
const data={assets:[{id:'a',name:'Sample',asset_tag:'TEST-1',status:'Good',health_score:95}],workOrders:[],inspections:[]}
const props={data,onAddAsset:noop,onOpenAsset:noop,onInspect:noop,onWorkOrders:noop,onPlanning:noop,onSupervisor:noop,onAssetFilter:noop,onSiteSafety:noop,onProjects:noop,onTimeClock:noop}
const view=role=>render(React.createElement(Dashboard,{...props,role}))
test('action-first dashboards',()=>{
 for(const [role,labels] of [
  ['technician',['My jobs','Clock in / out','Start inspection']],
  ['supervisor',['Projects &amp; crews','Crew approvals','Timesheets']],
  ['maintenance',['Work orders','Needs attention','My projects']],
  ['viewer',['View assets','Needs attention']]
 ]) {
  const html=view(role)
  for(const label of labels) assert.ok(html.includes(label),role+': '+label)
  assert.ok(html.includes('<details'),role+': secondary content collapsed')
 }
 assert.ok(!view('viewer').includes('Register asset'))
})
test('role-specific bottom navigation',()=>{
 for(const [role,labels] of [
  ['technician',['Projects','Time Clock','Inspect']],
  ['supervisor',['Projects','Supervisor','Time Clock']],
  ['maintenance',['Work Orders','Projects','Assets']],
  ['viewer',['Assets']]
 ]) {
  const html=render(React.createElement(AppShell,{organizationName:'Test',userEmail:'qa@example.com',role,active:'dashboard',onNavigate:noop,onSignOut:noop,children:'Test'}))
  const nav=html.split('<nav class="bottom-nav"')[1]?.split('</nav>')[0]||''
  for(const label of labels) assert.ok(nav.includes(label),role+': '+label)
  assert.ok(!nav.includes('Integrations'))
 }
})
test('asset registry hides detailed filters by default',()=>{
 const html=render(React.createElement(AssetsRegistry,{assets:data.assets,sites:[],onOpen:noop}))
 assert.ok(html.includes('Find an asset'))
 assert.ok(html.includes('More filters'))
 assert.ok(!html.includes('Lifecycle</label>'))
})
