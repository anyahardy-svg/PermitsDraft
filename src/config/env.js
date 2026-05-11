/**
 * Environment Configuration
 * Exposes environment variables in a way that works with Expo web builds
 */

export const config = {
  brevoApiKey: process.env.VITE_BREVO_API_KEY || '',
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
};

export default config;
