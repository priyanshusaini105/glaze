/**
 * API Key Manager
 * 
 * Centralized management of multiple API keys per provider with:
 * - Automatic rotation on rate limits/errors
 * - Persistent state via Redis (remembers exhausted keys across restarts)
 * - Optional key recovery after configurable time
 * - Graceful fallback to in-memory state
 */

import { logger } from "@trigger.dev/sdk";

// ============ Types ============

export interface KeyState {
    key: string;
    status: 'active' | 'exhausted' | 'error';
    lastError?: string;
    exhaustedAt?: number;
    errorCount: number;
}

export interface ApiKeyManagerConfig {
    /** Time in ms before retrying an exhausted key (default: 24 hours) */
    recoveryTimeMs: number;
    /** Number of errors before switching to next key (default: 1) */
    maxErrorsBeforeSwitch: number;
}

const DEFAULT_CONFIG: ApiKeyManagerConfig = {
    recoveryTimeMs: 24 * 60 * 60 * 1000, // 24 hours
    maxErrorsBeforeSwitch: 1,
};

// ============ Redis Connection ============

let redisClient: any = null;
let redisAvailable = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_MS = 30000;

async function getRedisClient(): Promise<any | null> {
    if (redisAvailable && redisClient) {
        return redisClient;
    }

    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_RETRY_MS) {
        return null;
    }
    lastConnectionAttempt = now;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        return null;
    }

    try {
        const { default: Redis } = await import('ioredis');
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            lazyConnect: true,
            connectTimeout: 5000,
            retryStrategy: (times: number) => {
                if (times > 3) return null;
                return Math.min(times * 100, 3000);
            },
        });

        await redisClient.connect();

        redisClient.on('error', () => {
            redisAvailable = false;
        });

        redisClient.on('ready', () => {
            redisAvailable = true;
        });

        redisClient.on('close', () => {
            redisAvailable = false;
        });

        redisAvailable = true;
        return redisClient;
    } catch {
        redisAvailable = false;
        return null;
    }
}

// ============ In-Memory Fallback ============

const inMemoryState = new Map<string, KeyState[]>();

// ============ API Key Manager ============

export class ApiKeyManager {
    private providerName: string;
    private config: ApiKeyManagerConfig;
    private keys: string[];
    private currentKeyIndex: number = 0;
    private initialized: boolean = false;

    constructor(providerName: string, config: Partial<ApiKeyManagerConfig> = {}) {
        this.providerName = providerName;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Parse keys from environment variable (comma-separated)
        const envKey = `${providerName.toUpperCase()}_API_KEY`;
        const keyString = process.env[envKey] || '';
        this.keys = keyString
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        if (this.keys.length === 0) {
            logger.warn(`⚠️ ApiKeyManager[${providerName}]: No API keys configured in ${envKey}`);
        } else {
            logger.info(`🔑 ApiKeyManager[${providerName}]: Initialized with ${this.keys.length} key(s)`);
        }
    }

    /**
     * Get Redis key for storing state
     */
    private getRedisKey(): string {
        return `apikey:state:${this.providerName}`;
    }

    /**
     * Initialize key states from Redis or create default
     */
    private async initializeState(): Promise<KeyState[]> {
        if (this.initialized) {
            return this.getState();
        }

        try {
            const redis = await getRedisClient();
            if (redis && redisAvailable) {
                const data = await redis.get(this.getRedisKey());
                if (data) {
                    const states: KeyState[] = JSON.parse(data);
                    // Merge with current keys (in case keys changed in env)
                    const stateMap = new Map(states.map(s => [s.key, s]));
                    const mergedStates = this.keys.map(key =>
                        stateMap.get(key) || this.createDefaultState(key)
                    );
                    inMemoryState.set(this.providerName, mergedStates);
                    this.initialized = true;

                    // Find first active key
                    this.currentKeyIndex = this.findActiveKeyIndex(mergedStates);

                    logger.info(`🔑 ApiKeyManager[${this.providerName}]: Loaded state from Redis`, {
                        totalKeys: this.keys.length,
                        activeIndex: this.currentKeyIndex,
                    });

                    return mergedStates;
                }
            }
        } catch (error) {
            logger.warn(`⚠️ ApiKeyManager[${this.providerName}]: Failed to load state from Redis`, {
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }

        // Create default states
        const defaultStates = this.keys.map(key => this.createDefaultState(key));
        inMemoryState.set(this.providerName, defaultStates);
        this.initialized = true;
        return defaultStates;
    }

    /**
     * Create default state for a key
     */
    private createDefaultState(key: string): KeyState {
        return {
            key,
            status: 'active',
            errorCount: 0,
        };
    }

    /**
     * Get current state (from memory)
     */
    private getState(): KeyState[] {
        return inMemoryState.get(this.providerName) || [];
    }

    /**
     * Find first active key index
     */
    private findActiveKeyIndex(states: KeyState[]): number {
        const now = Date.now();

        for (let i = 0; i < states.length; i++) {
            const state = states[i]!;

            // Check if exhausted key can be recovered
            if (state.status === 'exhausted' && state.exhaustedAt) {
                if (now - state.exhaustedAt >= this.config.recoveryTimeMs) {
                    state.status = 'active';
                    state.errorCount = 0;
                    state.exhaustedAt = undefined;
                    state.lastError = undefined;
                    logger.info(`🔄 ApiKeyManager[${this.providerName}]: Key ${i} recovered after timeout`);
                }
            }

            if (state.status === 'active') {
                return i;
            }
        }

        return -1; // No active keys
    }

    /**
     * Save state to Redis
     */
    private async saveState(): Promise<void> {
        const states = this.getState();
        if (states.length === 0) return;

        try {
            const redis = await getRedisClient();
            if (redis && redisAvailable) {
                // Store for 7 days
                await redis.setex(this.getRedisKey(), 7 * 24 * 60 * 60, JSON.stringify(states));
            }
        } catch (error) {
            logger.warn(`⚠️ ApiKeyManager[${this.providerName}]: Failed to save state to Redis`);
        }
    }

    /**
     * Get current working key
     * Returns null if no keys available
     */
    async getKey(): Promise<string | null> {
        await this.initializeState();

        const states = this.getState();
        if (states.length === 0) {
            logger.error(`❌ ApiKeyManager[${this.providerName}]: No keys configured (env var ${this.providerName.toUpperCase()}_API_KEY is empty or not set)`);
            return null;
        }

        // Find active key
        this.currentKeyIndex = this.findActiveKeyIndex(states);

        if (this.currentKeyIndex === -1) {
            logger.error(`❌ ApiKeyManager[${this.providerName}]: All ${this.keys.length} keys exhausted`);
            return null;
        }

        const key = this.keys[this.currentKeyIndex];
        logger.debug(`✅ ApiKeyManager[${this.providerName}]: Using key ${this.currentKeyIndex + 1}/${this.keys.length}`);
        return key || null;
    }

    /**
     * Mark a key as exhausted (rate limited, quota exceeded)
     */
    async markExhausted(key: string, reason?: string): Promise<void> {
        const states = this.getState();
        const keyIndex = this.keys.indexOf(key);

        if (keyIndex === -1 || !states[keyIndex]) {
            return;
        }

        states[keyIndex]!.status = 'exhausted';
        states[keyIndex]!.exhaustedAt = Date.now();
        states[keyIndex]!.lastError = reason;

        logger.warn(`⚠️ ApiKeyManager[${this.providerName}]: Key ${keyIndex} marked exhausted`, {
            reason,
            remainingKeys: states.filter(s => s.status === 'active').length,
        });

        // Find next active key
        this.currentKeyIndex = this.findActiveKeyIndex(states);

        await this.saveState();
    }

    /**
     * Mark a key as having an error (temporary)
     */
    async markError(key: string, error: Error): Promise<void> {
        const states = this.getState();
        const keyIndex = this.keys.indexOf(key);

        if (keyIndex === -1 || !states[keyIndex]) {
            return;
        }

        states[keyIndex]!.errorCount++;
        states[keyIndex]!.lastError = error.message;

        // If too many errors, mark as exhausted
        if (states[keyIndex]!.errorCount >= this.config.maxErrorsBeforeSwitch) {
            states[keyIndex]!.status = 'exhausted';
            states[keyIndex]!.exhaustedAt = Date.now();

            logger.warn(`⚠️ ApiKeyManager[${this.providerName}]: Key ${keyIndex} exhausted after ${this.config.maxErrorsBeforeSwitch} errors`);

            // Find next active key
            this.currentKeyIndex = this.findActiveKeyIndex(states);
        }

        await this.saveState();
    }

    /**
     * Check if a response indicates rate limiting
     */
    isRateLimited(status: number): boolean {
        return status === 429 || status === 403 || status === 503;
    }

    /**
     * Wrap an API call with automatic key rotation
     * 
     * @param apiCall Function that makes the API call with the given key
     * @returns Result of the API call, or null if all keys exhausted
     */
    async withKey<T>(
        apiCall: (key: string) => Promise<T>
    ): Promise<T | null> {
        await this.initializeState();

        const states = this.getState();
        const maxAttempts = states.filter(s => s.status === 'active').length || 1;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const key = await this.getKey();

            if (!key) {
                logger.error(`❌ ApiKeyManager[${this.providerName}]: No keys available`);
                return null;
            }

            try {
                const result = await apiCall(key);
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                // Check for rate limit markers
                if (errorMessage.includes('KEY_EXHAUSTED') ||
                    errorMessage.includes('429') ||
                    errorMessage.includes('403') ||
                    errorMessage.includes('rate limit') ||
                    errorMessage.includes('quota')) {

                    await this.markExhausted(key, errorMessage);
                    logger.info(`🔄 ApiKeyManager[${this.providerName}]: Switching to next key after: ${errorMessage}`);
                    continue; // Try next key
                }

                // Other error - mark and throw
                await this.markError(key, error instanceof Error ? error : new Error(errorMessage));
                throw error;
            }
        }

        logger.error(`❌ ApiKeyManager[${this.providerName}]: All keys exhausted after retries`);
        return null;
    }

    /**
     * Get status summary for debugging
     */
    async getStatus(): Promise<{
        provider: string;
        totalKeys: number;
        activeKeys: number;
        currentIndex: number;
        states: Array<{ index: number; status: string; errorCount: number }>;
    }> {
        await this.initializeState();
        const states = this.getState();

        return {
            provider: this.providerName,
            totalKeys: this.keys.length,
            activeKeys: states.filter(s => s.status === 'active').length,
            currentIndex: this.currentKeyIndex,
            states: states.map((s, i) => ({
                index: i,
                status: s.status,
                errorCount: s.errorCount,
            })),
        };
    }
}

// ============ Singleton Instances ============

const managers = new Map<string, ApiKeyManager>();

/**
 * Get or create an ApiKeyManager for a provider
 */
export function getApiKeyManager(
    providerName: string,
    config?: Partial<ApiKeyManagerConfig>
): ApiKeyManager {
    const existing = managers.get(providerName);
    if (existing) {
        return existing;
    }

    const manager = new ApiKeyManager(providerName, config);
    managers.set(providerName, manager);
    return manager;
}

// Pre-create managers for common providers
export const serperKeyManager = getApiKeyManager('serper');
export const hunterKeyManager = getApiKeyManager('hunter');
export const prospeoKeyManager = getApiKeyManager('prospeo');
export const zerobounceKeyManager = getApiKeyManager('zerobounce');
