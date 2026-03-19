import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://rchcrpvwhnvcxgskcewb.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_q04W1lWXz9iIuGywUn5_Qw_QumySsmI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
