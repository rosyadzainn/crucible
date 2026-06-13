import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuditEvent = {
  id: string;
  run_id: string;
  seq: number;
  round: number | null;
  event: string;
  agent: string;
  score: number | null;
  decision: string | null;
  content: string | null;
  hash: string | null;
  created_at: string;
};
