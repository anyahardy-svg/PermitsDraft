import { createClient } from '@supabase/supabase-js';

// Try to load Supabase credentials from environment variables
// For Expo/React Native apps, these may not be available via process.env
// In that case, check if they're available as global/constant imports
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

// If still not found, try importing from a config file (for native builds)
if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const config = require('./config.js');
    supabaseUrl = supabaseUrl || config.SUPABASE_URL;
    supabaseAnonKey = supabaseAnonKey || config.SUPABASE_ANON_KEY;
  } catch (e) {
    // Config file doesn't exist, that's okay
  }
}

// Log for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  if (supabaseUrl) {
    console.log('✅ Supabase URL loaded:', supabaseUrl.substring(0, 25) + '...');
  } else {
    console.warn(
      '⚠️ Supabase URL not found. Please ensure VITE_SUPABASE_URL is set in .env file or create src/config.js'
    );
  }
}

// Create Supabase client even if credentials are missing (will error when trying to use)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
