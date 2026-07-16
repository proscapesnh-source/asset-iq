export function makeId(prefix = 'ID') {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomPart}`
}
