// This publishable key is intended for browser use. Database access is limited by RLS.
const supabaseUrl = 'https://qpgsnaruhvwgmdednrnv.supabase.co';
const supabasePublishableKey = 'sb_publishable_iaStC65eu0HAZN7APYTN-g_TPJ1Tw1k';
if (window.supabase?.createClient) {
  window.vastraSupabase = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
}
