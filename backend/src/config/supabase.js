import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !secret || !publishable) {
  throw new Error("Missing Supabase environment variables. Check backend/.env");
}

// Admin client: backend only. Never expose this key to the browser.
export const db = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Used only to validate the customer's Supabase access token.
export const authClient = createClient(url, publishable, {
  auth: { autoRefreshToken: false, persistSession: false }
});
