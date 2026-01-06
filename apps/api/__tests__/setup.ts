/**
 * Test Setup File
 * 
 * This file runs before all tests and sets up the test environment.
 * For integration tests that need a database, ensure DATABASE_URL is set.
 */

import { vi } from 'vitest';

// Set default test environment variables if not set
process.env.NODE_ENV = 'test';

// For tests, we'll use the main database if DATABASE_URL is not specifically set for tests
// In production CI, you should set up a dedicated test database
if (!process.env.DATABASE_URL) {
    // Default to development database - tests will run against it
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/glaze_db';
}

// Global test utilities
export const TEST_TIMEOUT = 30000;

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clean up function for tests
export const cleanupTestData = async () => {
    // Add cleanup logic if needed
};
