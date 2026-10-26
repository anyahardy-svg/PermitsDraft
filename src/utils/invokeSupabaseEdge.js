import { supabase, getSupabaseAnonKey } from '../supabaseClient';

/**
 * Invoke a Supabase Edge Function using the anon key so a stale user JWT cannot cause 401.
 */
export async function invokeSupabaseEdge(functionName, payload) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase client is not configured' } };
  }

  const anonKey = getSupabaseAnonKey();
  const headers = anonKey ? { Authorization: `Bearer ${anonKey}` } : undefined;
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
    headers,
  });

  if (error) {
    let responseBody = data;
    if (!responseBody && error?.context && typeof error.context.json === 'function') {
      try {
        responseBody = await error.context.json();
      } catch (parseError) {
        console.warn(`Could not parse ${functionName} error body:`, parseError);
      }
    }
    if (responseBody && typeof responseBody === 'object') {
      return { data: responseBody, error: null };
    }
    return { data: null, error };
  }

  return { data, error: null };
}
