export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? "";
export const isPushConfigured = vapidPublicKey.length > 0;
