import { createClient } from 'npm:@supabase/supabase-js@2.57.0'

const TZ = 'America/Chicago'
const respond = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const env = (name: string) => Deno.env.get(name) || ''
const safe = (value: unknown) => {
  const text = String(value ?? '')
  return /^[\s]*[=+@-]/.test(text) && !/^-\d+(\.\d+)?$/.test(text) ? "'" + text : text
}
const dateParts = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}
const localMidnight = (isoDate: string) => {
  const midday = new Date(isoDate + 'T12:00:00Z')
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(midday).find(part => part.type === 'timeZoneName')?.value || 'GMT-6'
  const m = zone.match(/GMT([+-])(\d+)(?::(\d+))?/)
  const offset = m ? (m[1] === '+' ? 1 : -1) * (+m[2] * 60 + +(m[3] || 0)) : -360
  return new Date(Date.parse(isoDate + 'T00:00:00Z') - offset * 60000)
}
const lastWeek = () => {
  const parts = dateParts(new Date())
  const today = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day))
  const mondayIndex = (today.getUTCDay() + 6) % 7
  const thisMonday = new Date(today.getTime() - mondayIndex * 86400000)
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000)
  const startLabel = lastMonday.toISOString().slice(0, 10)
  const endLabel = thisMonday.toISOString().slice(0, 10)
  return { startLabel, endLabel, start: localMidnight(startLabel), end: localMidnight(endLabel) }
}
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const getGoogleToken = async () => {
  const json = env('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (!json) throw new Error('Google Sheets credentials are not configured.')
  const creds = JSON.parse(json)
  if (!creds.client_email || !creds.private_key) throw new Error('Invalid Google service account credentials.')
  const privateBytes = Uint8Array.from(atob(creds.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')), c => c.charCodeAt(0))
  const privateKey = await crypto.subtle.importKey('pkcs8', privateBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ iss: creds.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })))
  const signed = header + '.' + payload
  const signature = b64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(signed))))
  const reply = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signed + '.' + signature }) })
  if (!reply.ok) throw new Error('Google authentication failed (' + reply.status + ').')
  const data = await reply.json()
  return data.access_token as string
}
const googleRequest = async (token: string, path: string, method = 'GET', data?: unknown) => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + env('GOOGLE_SHEET_ID') + path, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) })
  if (!response.ok) throw new Error('Google Sheets API returned ' + response.status + '. Confirm the spreadsheet is shared with the service account.')
  return response.status === 204 ? null : response.json()
}
const upsertTab = async (token: string, title: string, values: unknown[][]) => {
  const spreadsheet = await googleRequest(token, '?fields=sheets.properties.title')
  if (!(spreadsheet.sheets || []).some((sheet: { properties: { title: string } }) => sheet.properties.title === title)) {
    await googleRequest(token, ':batchUpdate', 'POST', { requests: [{ addSheet: { properties: { title } } }] })
  }
  const range = encodeURIComponent("'" + title.replace(/'/g, "''") + "'!A:Z")
  await googleRequest(token, '/values/' + range + ':clear', 'POST', {})
  await googleRequest(token, '/values/' + range + '?valueInputOption=RAW', 'PUT', { majorDimension: 'ROWS', values })
}
Deno.serve(async request => {
  if (request.method !== 'POST') return respond(405, { error: 'POST required' })
  try {
    const url = env('SUPABASE_URL')
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
    const org = env('PAYROLL_ORG_ID')
    const spreadsheet = env('GOOGLE_SHEET_ID')
    if (!url || !serviceKey || !org || !spreadsheet || !env('GOOGLE_SERVICE_ACCOUNT_JSON')) return respond(503, { error: 'Payroll Google Sheets integration is not configured. Set the server secrets and share the sheet with the service account.' })
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
    const schedulerSecret = env('PAYROLL_SYNC_TOKEN')
    const cronAuthorized = Boolean(schedulerSecret) && request.headers.get('x-payroll-sync-token') === schedulerSecret
    if (!cronAuthorized) {
      if (!token) return respond(401, { error: 'Sign in to export payroll.' })
      const client = createClient(url, serviceKey, { global: { headers: { Authorization: 'Bearer ' + token } } })
      const { data: user, error: userError } = await client.auth.getUser(token)
      if (userError || !user.user) return respond(401, { error: 'Invalid session.' })
      const { data: allowed, error: roleError } = await client.rpc('has_org_role', { target_org: org, allowed_roles: ['owner', 'admin', 'manager', 'supervisor'] })
      if (roleError || allowed !== true) return respond(403, { error: 'Supervisor access required.' })
    }
    const admin = createClient(url, serviceKey)
    const week = lastWeek()
    const { data: entries, error: entryError } = await admin.from('technician_time_entries').select('*').eq('organization_id', org).gte('clock_in_at', new Date(week.start.getTime() - 86400000).toISOString()).lt('clock_in_at', week.end.toISOString()).order('clock_in_at')
    if (entryError) throw entryError
    const ids = (entries || []).map(r => r.id)
    const { data: corrections, error: correctionError } = ids.length ? await admin.from('technician_time_corrections').select('*').eq('organization_id', org).in('entry_id', ids).order('corrected_at', { ascending: false }) : { data: [], error: null }
    if (correctionError) throw correctionError
    const latestCorrection = new Map()
    for (const change of corrections || []) if (!latestCorrection.has(change.entry_id)) latestCorrection.set(change.entry_id, change)
    const siteIds = [...new Set((entries || []).map(r => latestCorrection.get(r.id)?.corrected_site_id ?? r.site_id).filter(Boolean))]
    const { data: sites, error: sitesError } = siteIds.length ? await admin.from('sites').select('id,name').eq('organization_id', org).in('id', siteIds) : { data: [], error: null }
    if (sitesError) throw sitesError
    const siteNames = new Map((sites || []).map(s => [s.id, s.name]))
    const userIds = [...new Set((entries || []).map(r => r.technician_id))]
    const userNames = new Map()
    for (const id of userIds) {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error) throw error
      userNames.set(id, data.user?.email || id)
    }
    const summary = new Map()
    const detail: unknown[][] = [['Technician', 'Site', 'Work type', 'Clock in (UTC)', 'Clock out (UTC)', 'Week hours', 'Review', 'Correction reason', 'Note']]
    const gps: unknown[][] = [['Technician', 'Clock in (UTC)', 'In latitude', 'In longitude', 'In accuracy m', 'Out latitude', 'Out longitude', 'Out accuracy m']]
    for (const entry of entries || []) {
      const correction = latestCorrection.get(entry.id)
      const begin = correction?.corrected_clock_in_at || entry.clock_in_at
      const end = correction ? correction.corrected_clock_out_at : entry.clock_out_at
      const overlap = Math.max(0, Math.min(end ? Date.parse(end) : week.end.getTime(), week.end.getTime()) - Math.max(Date.parse(begin), week.start.getTime()))
      if (!overlap && end) continue
      const email = userNames.get(entry.technician_id)
      const site = siteNames.get(correction ? correction.corrected_site_id : entry.site_id) || ''
      const type = correction?.corrected_work_type || entry.work_type
      const hours = end ? overlap / 3600000 : 0
      const review = !end ? 'OPEN SHIFT - REVIEW' : correction ? 'CORRECTED - REVIEW' : 'REVIEW'
      detail.push([safe(email), safe(site), safe(type), begin, end || '', Number(hours.toFixed(2)), review, safe(correction?.reason || ''), safe(entry.note || '')])
      gps.push([safe(email), entry.clock_in_at, entry.clock_in_lat, entry.clock_in_lon, entry.clock_in_accuracy_m, entry.clock_out_lat, entry.clock_out_lon, entry.clock_out_accuracy_m])
      const key = [email, site, type].join('||')
      if (!summary.has(key)) summary.set(key, { email, site, type, hours: 0, shifts: 0, open: 0, corrected: 0 })
      const record = summary.get(key)
      record.hours += hours
      record.shifts++
      if (!end) record.open++
      if (correction) record.corrected++
    }
    const payroll: unknown[][] = [['Week start (Chicago)', 'Week end exclusive', 'Technician', 'Site', 'Work type', 'Completed hours', 'Shifts', 'Open shifts', 'Corrected shifts', 'Approval status']]
    for (const r of summary.values()) payroll.push([week.startLabel, week.endLabel, safe(r.email), safe(r.site), safe(r.type), Number(r.hours.toFixed(2)), r.shifts, r.open, r.corrected, 'PENDING SUPERVISOR APPROVAL'])
    const googleToken = await getGoogleToken()
    await upsertTab(googleToken, 'Payroll ' + week.startLabel, payroll)
    await upsertTab(googleToken, 'Shifts ' + week.startLabel, detail)
    await upsertTab(googleToken, 'GPS ' + week.startLabel, gps)
    return respond(200, { ok: true, week: week.startLabel, records: detail.length - 1, spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + spreadsheet + '/edit' })
  } catch (error) {
    console.error('Payroll Sheets sync failed', error)
    return respond(500, { error: error instanceof Error ? error.message : 'Payroll sync failed' })
  }
})
