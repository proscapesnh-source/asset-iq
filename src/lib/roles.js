const SUPERVISOR_ROLES = ['owner', 'admin', 'manager', 'supervisor']

export function workspaceForRole(role) {
  if (SUPERVISOR_ROLES.includes(role)) return 'supervisor'
  if (role === 'maintenance') return 'maintenance'
  if (role === 'technician' || role === 'inspector') return 'technician'
  return 'viewer'
}

export function workspaceLabel(role) {
  return {
    supervisor: 'Supervisor workspace',
    technician: 'Technician workspace',
    maintenance: 'Maintenance workspace',
    viewer: 'Read-only workspace',
  }[workspaceForRole(role)]
}

const WORKSPACE_VIEWS = {
  supervisor: ['dashboard', 'assets', 'sites', 'site-training', 'job-starts', 'work', 'planning', 'knowledge', 'supervisor'],
  technician: ['dashboard', 'assets', 'inspect', 'site-training', 'job-starts', 'planning', 'knowledge'],
  maintenance: ['dashboard', 'assets', 'site-training', 'work', 'planning', 'knowledge'],
  viewer: ['dashboard', 'assets', 'site-training'],
}

export function allowedViews(role) {
  return WORKSPACE_VIEWS[workspaceForRole(role)]
}

export function canAccessView(role, view) {
  if (view === 'asset-detail') return true
  if (view === 'edit-asset' || view === 'add-asset') return ['supervisor', 'technician'].includes(workspaceForRole(role))
  return allowedViews(role).includes(view)
}

export function capabilitiesForRole(role) {
  const workspace = workspaceForRole(role)
  return {
    workspace,
    inspect: workspace === 'technician',
    maintain: workspace === 'maintenance' || workspace === 'supervisor',
    manageAssets: workspace === 'technician' || workspace === 'supervisor',
    manageLifecycle: workspace === 'supervisor',
    manageQr: workspace === 'supervisor',
    manageBudget: workspace === 'supervisor',
    viewReports: workspace !== 'viewer',
  }
}
