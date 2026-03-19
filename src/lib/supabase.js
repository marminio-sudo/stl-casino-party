// src/lib/supabase.js
// Shared Supabase client — imported by all pages

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Replace these with your actual values from:
// Supabase dashboard → Project Settings → API
export const SUPABASE_URL = 'https://rchcrpvwhnvcxgskcewb.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_qO4W1LWXz9iIuGywUn5_Qw_QumySsmI' // full key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
