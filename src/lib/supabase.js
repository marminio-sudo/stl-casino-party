import { createClient } from '@supabase/supabase-js'

const url = 'https://rchcrpvwhnvcxgskcewb.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjaGNycHZ3aG52Y3hnc2tjZXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDgzMjQsImV4cCI6MjA4OTUyNDMyNH0.UFRFa2InKHXkblZTvrB0aIYen1zewDILEtlclDosC-Q'

export const supabase = createClient(url, key)
