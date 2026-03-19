import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://rchcrpvwhnvcxgskcewb.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
