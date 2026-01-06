import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Enable globals (describe, it, expect, etc.)
        globals: true,

        // Include patterns for test files
        include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],

        // Exclude patterns
        exclude: ['node_modules', 'dist', '.turbo'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules',
                '**/__tests__/**',
                '**/*.test.ts',
                'vitest.config.ts',
            ],
        },

        // Test timeout
        testTimeout: 30000,

        // Setup files
        setupFiles: ['./__tests__/setup.ts'],

        // Pool configuration for Bun compatibility
        pool: 'forks',

        // Reporter
        reporters: ['verbose'],
    },
});
