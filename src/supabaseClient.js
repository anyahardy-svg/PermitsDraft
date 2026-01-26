import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nszkuoxibzcbiqaqdfml.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zemt1b3hpYnpjYmlxYXFkZm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODU2ODgsImV4cCI6MjA4NDk2MTY4OH0.cm3lxhB08R9A53XYLcP1qXOk9zcMHKIo54qKkaE2UFM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
