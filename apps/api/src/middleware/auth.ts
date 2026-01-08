import { Elysia } from 'elysia';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for server-side auth verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase environment variables not set. Auth middleware will be disabled.');
}

/**
 * Verify a Supabase JWT token and return the user ID
 * Returns null if the token is invalid or missing
 */
async function verifyToken(authHeader: string | undefined): Promise<string | null> {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('[Auth] Token verification failed:', error?.message);
            return null;
        }

        console.log('[Auth] User authenticated:', user.id);
        return user.id;
    } catch (err) {
        console.error('[Auth] Token verification error:', err);
        return null;
    }
}

/**
 * Auth middleware for Elysia
 * Verifies JWT tokens from Supabase and attaches user ID to the request context
 * 
 * Note: This middleware does NOT reject unauthenticated requests.
 * Routes should check userId and return appropriate errors if needed.
 */
export const authMiddleware = new Elysia({ name: 'auth' })
    .derive({ as: 'scoped' }, async ({ headers }) => {
        const userId = await verifyToken(headers['authorization']);
        return {
            userId,
            isAuthenticated: userId !== null
        };
    });

/**
 * Helper function to check table ownership
 * Returns true if the user owns the table, or if no ownership is set (legacy tables)
 */
export function checkTableOwnership(tableUserId: string | null, requestUserId: string | null): boolean {
    // If no ownership set on table (legacy), allow access
    if (!tableUserId) return true;

    // If user is not authenticated, deny access to owned tables
    if (!requestUserId) return false;

    // Check ownership
    return tableUserId === requestUserId;
}
