// Connection to the online database (Supabase).
// The URL and publishable key come from .env.local (or the hosting
// provider's settings once deployed). Both are designed to be public; the
// database's own security rules decide what each visitor may read or change.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured ? createClient(url, key) : null
