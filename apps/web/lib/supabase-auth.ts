import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a Supabase client for use in client components
 * This client handles auth sessions via cookies automatically
 */
export function createClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get the current session's access token
 * Useful for making authenticated API requests
 */
export async function getAccessToken(): Promise<string | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

/**
 * Get the current user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
}
