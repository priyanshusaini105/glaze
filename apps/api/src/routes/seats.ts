/**
 * Seats API Routes
 * 
 * Endpoints for managing user seats and credits.
 * - GET /me/seat - Get current user's seat info
 * - GET /me/credits - Get current user's credit balance
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth';
import {
    getSeatByUserId,
    createSeat,
    getSeatCount,
    MVP_CONFIG
} from '../services/seat-service';

export const seatsRoutes = new Elysia()
    .use(authMiddleware)

    /**
     * GET /me/seat
     * Get the current user's seat information
     */
    .get('/me/seat', async ({ userId, isAuthenticated, set }) => {
        if (!isAuthenticated || !userId) {
            set.status = 401;
            return { error: 'Authentication required' };
        }

        const seat = await getSeatByUserId(userId);

        if (!seat) {
            set.status = 404;
            return { error: 'No seat found. You may need to complete onboarding.' };
        }

        return {
            id: seat.id,
            email: seat.email,
            credits: seat.credits,
            totalCreditsUsed: seat.totalCreditsUsed,
            createdAt: seat.createdAt.toISOString(),
        };
    })

    /**
     * GET /me/credits
     * Get the current user's credit balance (simplified)
     */
    .get('/me/credits', async ({ userId, isAuthenticated, set }) => {
        if (!isAuthenticated || !userId) {
            set.status = 401;
            return { error: 'Authentication required' };
        }

        const seat = await getSeatByUserId(userId);

        if (!seat) {
            set.status = 404;
            return { error: 'No seat found' };
        }

        return {
            credits: seat.credits,
            totalCreditsUsed: seat.totalCreditsUsed,
            maxCredits: MVP_CONFIG.CREDITS_PER_SEAT,
        };
    })

    /**
     * POST /me/seat
     * Create a seat for the current user (called during onboarding)
     */
    .post('/me/seat', async ({ userId, isAuthenticated, body, set }) => {
        if (!isAuthenticated || !userId) {
            set.status = 401;
            return { error: 'Authentication required' };
        }

        const { email } = body as { email: string };

        // Check if seats are available
        const currentCount = await getSeatCount();
        if (currentCount >= MVP_CONFIG.MAX_SEATS) {
            set.status = 403;
            return { error: `Alpha program is full (${MVP_CONFIG.MAX_SEATS} seats). Please join the waitlist.` };
        }

        // Create the seat
        const seat = await createSeat(userId, email);

        if (!seat) {
            set.status = 409;
            return { error: 'Could not create seat. You may already have one.' };
        }

        set.status = 201;
        return {
            id: seat.id,
            email: seat.email,
            credits: seat.credits,
            message: `Welcome to the alpha! You have ${seat.credits} enrichment credits.`,
        };
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
        }),
    })

    /**
     * GET /seats/status
     * Get seat availability status (public endpoint)
     */
    .get('/seats/status', async () => {
        const count = await getSeatCount();
        const available = MVP_CONFIG.MAX_SEATS - count;

        return {
            totalSeats: MVP_CONFIG.MAX_SEATS,
            usedSeats: count,
            availableSeats: available,
            isAvailable: available > 0,
            creditsPerSeat: MVP_CONFIG.CREDITS_PER_SEAT,
        };
    });

/**
 * Register seats routes
 */
export const registerSeatsRoutes = (app: Elysia) => app.use(seatsRoutes);
