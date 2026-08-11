import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing Supabase settings. Copy .env.example to .env and add your project URL and publishable/anon key.')
}

export const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'inspection-photos'
export const supabase = createClient(url, key)
