import { createClient } from '@supabase/supabase-js';
import { PhoneAuthMode } from '../types';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[NextGen] Supabase environment variables are missing or set to placeholder values. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Fallback to avoid runtime crashes during dev or build before .env is configured
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://dummy.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'dummy-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const PHONE_AUTH_MODE: PhoneAuthMode = 
  (import.meta.env.VITE_PHONE_AUTH_MODE as PhoneAuthMode) === 'otp' ? 'otp' : 'simple';
