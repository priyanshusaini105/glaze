import { Elysia } from 'elysia';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for server-side auth verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase environment variables not set. Auth middleware will be disabled.');
}

/**
 * Auth middleware for Elysia
 * Verifies JWT tokens from Supabase and attaches user ID to the request context
 */
export const authMiddleware = new Elysia({ name: 'auth' })
    .derive({ as: 'scoped' }, async ({ headers }) => {
        // If Supabase is not configured, allow all requests (development mode)
        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                userId: null as string | null,
                isAuthenticated: false
            };
        }

        const authHeader = headers['authorization'];

        // Check for Authorization header
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { userId: null as string | null, isAuthenticated: false };
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            // Create Supabase client with service role key
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            });

            // Verify the JWT token and get user
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                console.log('[Auth] Token verification failed:', error?.message);
                return { userId: null as string | null, isAuthenticated: false };
            }

            console.log('[Auth] User authenticated:', user.id);
            return {
                userId: user.id,
                isAuthenticated: true
            };
        } catch (error) {
            console.error('[Auth] Middleware error:', error);
            return { userId: null as string | null, isAuthenticated: false };
        }
    });

/**
 * Guard middleware - requires authentication
 * Use this on routes that require a valid user session
 */
export const requireAuth = new Elysia({ name: 'requireAuth' })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, ({ userId, isAuthenticated, error }) => {
        if (!isAuthenticated || !userId) {
            throw error(401, {
                message: 'Authentication required',
                error: 'Unauthorized',
            });
        }
        return { userId: userId as string };
    });
