import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE!;

// Public/read client (used in server components for leaderboard etc.)
export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

// Admin client — only use server-side in route handlers / cron.
export const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false },
});
