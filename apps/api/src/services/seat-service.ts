/**
 * Seat Service
 * 
 * Manages user seats and credits for the MVP/alpha version.
 * - Maximum 10 seats
 * - 25 credits per seat
 * - 1 credit = 1 cell enrichment
 */

import { prisma } from '../db';

// MVP Configuration
export const MVP_CONFIG = {
    MAX_SEATS: 10,
    CREDITS_PER_SEAT: 25,
} as const;

export interface SeatInfo {
    id: string;
    userId: string;
    email: string;
    credits: number;
    totalCreditsUsed: number;
    createdAt: Date;
}

export interface CreditCheckResult {
    hasCredits: boolean;
    creditsRemaining: number;
    creditsRequired: number;
    message?: string;
}

/**
 * Get a seat by user ID
 */
export async function getSeatByUserId(userId: string): Promise<SeatInfo | null> {
    return prisma.seat.findUnique({
        where: { userId },
        select: {
            id: true,
            userId: true,
            email: true,
            credits: true,
            totalCreditsUsed: true,
            createdAt: true,
        },
    });
}

/**
 * Get seat count to enforce the 10 seat limit
 */
export async function getSeatCount(): Promise<number> {
    return prisma.seat.count();
}

/**
 * Check if new signups are allowed (seats available)
 */
export async function canCreateSeat(): Promise<boolean> {
    const count = await getSeatCount();
    return count < MVP_CONFIG.MAX_SEATS;
}

/**
 * Create a new seat for a user
 * Returns null if max seats reached
 */
export async function createSeat(
    userId: string,
    email: string
): Promise<SeatInfo | null> {
    // Check if we can create a new seat
    const canCreate = await canCreateSeat();
    if (!canCreate) {
        console.log('[seat-service] Max seats reached, cannot create new seat');
        return null;
    }

    // Check if user already has a seat
    const existingSeat = await getSeatByUserId(userId);
    if (existingSeat) {
        console.log('[seat-service] User already has a seat:', userId);
        return existingSeat;
    }

    // Create the seat
    const seat = await prisma.seat.create({
        data: {
            userId,
            email,
            credits: MVP_CONFIG.CREDITS_PER_SEAT,
        },
        select: {
            id: true,
            userId: true,
            email: true,
            credits: true,
            totalCreditsUsed: true,
            createdAt: true,
        },
    });

    console.log('[seat-service] Created seat for user:', userId, 'with', seat.credits, 'credits');
    return seat;
}

/**
 * Check if a user has sufficient credits
 */
export async function checkCredits(
    userId: string,
    creditsRequired: number
): Promise<CreditCheckResult> {
    const seat = await getSeatByUserId(userId);

    if (!seat) {
        return {
            hasCredits: false,
            creditsRemaining: 0,
            creditsRequired,
            message: 'No seat found for this user. Please contact support.',
        };
    }

    if (seat.credits < creditsRequired) {
        return {
            hasCredits: false,
            creditsRemaining: seat.credits,
            creditsRequired,
            message: `Insufficient credits. You have ${seat.credits} credits, but ${creditsRequired} are required.`,
        };
    }

    return {
        hasCredits: true,
        creditsRemaining: seat.credits,
        creditsRequired,
    };
}

/**
 * Deduct credits from a user's seat
 * Returns the new credit balance, or null if insufficient credits
 */
export async function deductCredits(
    userId: string,
    amount: number
): Promise<number | null> {
    // First check if user has enough credits
    const seat = await getSeatByUserId(userId);
    if (!seat || seat.credits < amount) {
        console.log('[seat-service] Cannot deduct credits. Seat:', seat?.id, 'Credits:', seat?.credits, 'Required:', amount);
        return null;
    }

    // Deduct credits atomically
    const updated = await prisma.seat.update({
        where: { userId },
        data: {
            credits: { decrement: amount },
            totalCreditsUsed: { increment: amount },
        },
        select: { credits: true },
    });

    console.log('[seat-service] Deducted', amount, 'credits from user:', userId, 'Remaining:', updated.credits);
    return updated.credits;
}

/**
 * Refund credits to a user (e.g., if enrichment fails)
 */
export async function refundCredits(
    userId: string,
    amount: number
): Promise<number | null> {
    const seat = await getSeatByUserId(userId);
    if (!seat) {
        return null;
    }

    // Don't refund more than was used
    const actualRefund = Math.min(amount, seat.totalCreditsUsed);
    if (actualRefund <= 0) {
        return seat.credits;
    }

    const updated = await prisma.seat.update({
        where: { userId },
        data: {
            credits: { increment: actualRefund },
            totalCreditsUsed: { decrement: actualRefund },
        },
        select: { credits: true },
    });

    console.log('[seat-service] Refunded', actualRefund, 'credits to user:', userId, 'New balance:', updated.credits);
    return updated.credits;
}

/**
 * Get all seats (admin function)
 */
export async function getAllSeats(): Promise<SeatInfo[]> {
    return prisma.seat.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            userId: true,
            email: true,
            credits: true,
            totalCreditsUsed: true,
            createdAt: true,
        },
    });
}
