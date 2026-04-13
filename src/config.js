/**
 * Supabase Configuration
 * This file serves as fallback for native builds when process.env is not available
 * 
 * FOR DEVELOPMENT:
 * Copy values from your .env file to this file
 * 
 * PRODUCTION:
 * This file will not be committed (add to .gitignore if it contains real keys)
 * Use environment variables or build-time configuration instead
 */

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nszkuoxibzcbiqaqdfml.supabase.co';
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zemt1b3hpYnpjYmlxYXFkZm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODU2ODgsImV4cCI6MjA4NDk2MTY4OH0.cm3lxhB08R9A53XYLcP1qXOk9zcMHKIo54qKkaE2UFM';
