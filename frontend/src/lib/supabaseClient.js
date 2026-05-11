import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const googleAuthFlag = import.meta.env.VITE_ENABLE_GOOGLE_AUTH;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isGoogleAuthEnabled = isSupabaseConfigured && googleAuthFlag === 'true';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
