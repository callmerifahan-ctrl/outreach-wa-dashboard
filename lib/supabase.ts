import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qfebkqdexgnlwbdzdhqv.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_69l8_45AAPqjeCsFdSbeXA_Y2qfJTzT'

export const supabase = createClient(supabaseUrl, supabaseKey)