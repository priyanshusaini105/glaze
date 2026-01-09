'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

// Subscription status enum for better tracking
export type SubscriptionStatus = 'CONNECTING' | 'SUBSCRIBED' | 'ERROR' | 'CLOSED' | 'TIMED_OUT';

interface ChannelState {
  channel: RealtimeChannel;
  status: SubscriptionStatus;
  lastEventTime: number;
  retryCount: number;
}

interface SupabaseRealtimeContextValue {
  isConnected: boolean;
  subscribe: (channelName: string, config: ChannelConfig) => RealtimeChannel;
  unsubscribe: (channelName: string) => Promise<void>;
  getChannelStatus: (channelName: string) => SubscriptionStatus | undefined;
}

interface ChannelConfig {
  table?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  filter?: string;
  onUpdate?: (payload: any) => void;
  onInsert?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

const SupabaseRealtimeContext = createContext<SupabaseRealtimeContextValue | undefined>(undefined);

// Max retry attempts for reconnection
const MAX_RETRY_ATTEMPTS = 5;
// Base delay for exponential backoff (ms)
const BASE_RETRY_DELAY = 1000;
// Connection timeout (ms)
const CONNECTION_TIMEOUT = 10000;

export function SupabaseRealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<Map<string, ChannelState>>(new Map());
  const configsRef = useRef<Map<string, ChannelConfig>>(new Map());

  // Check overall connection status
  useEffect(() => {
    const checkConnection = () => {
      let hasActiveSubscription = false;
      channelsRef.current.forEach((state) => {
        if (state.status === 'SUBSCRIBED') {
          hasActiveSubscription = true;
        }
      });
      setIsConnected(hasActiveSubscription);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
      // Clean up all channels on unmount
      channelsRef.current.forEach((state, channelName) => {
        console.log('[SupabaseRealtimeProvider] Cleanup on unmount:', channelName);
        supabase.removeChannel(state.channel);
      });
      channelsRef.current.clear();
      configsRef.current.clear();
    };
  }, []);

  // Helper: Wait for channel removal to complete
  const removeChannelAsync = useCallback(async (channelName: string): Promise<void> => {
    const existingState = channelsRef.current.get(channelName);
    if (!existingState) return;

    console.log('[SupabaseRealtimeProvider] Removing channel:', channelName);
    
    try {
      // Remove the channel and wait for confirmation
      const result = await supabase.removeChannel(existingState.channel);
      console.log('[SupabaseRealtimeProvider] Channel removed:', { channelName, result });
    } catch (error) {
      console.warn('[SupabaseRealtimeProvider] Error removing channel:', { channelName, error });
    }
    
    // Always clean up our tracking regardless of result
    channelsRef.current.delete(channelName);
  }, []);

  // Helper: Subscribe with retry logic
  const subscribeWithRetry = useCallback((
    channelName: string,
    config: ChannelConfig,
    retryCount: number = 0
  ): RealtimeChannel => {
    console.log('[SupabaseRealtimeProvider] Creating subscription:', { channelName, retryCount });

    // Create new channel
    const channel = supabase.channel(channelName);

    // Initialize channel state
    const channelState: ChannelState = {
      channel,
      status: 'CONNECTING',
      lastEventTime: Date.now(),
      retryCount,
    };
    channelsRef.current.set(channelName, channelState);

    // Configure postgres changes subscription
    if (config.table) {
      const postgresConfig: any = {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table,
      };

      if (config.filter) {
        postgresConfig.filter = config.filter;
      }

      console.log('[SupabaseRealtimeProvider] Setting up postgres_changes listener:', postgresConfig);

      channel.on('postgres_changes', postgresConfig, (payload) => {
        // Update last event time
        const state = channelsRef.current.get(channelName);
        if (state) {
          state.lastEventTime = Date.now();
        }

        console.log('[SupabaseRealtimeProvider] postgres_changes event:', {
          channelName,
          eventType: payload.eventType,
          table: config.table,
          hasNew: !!payload.new,
          hasOld: !!payload.old,
        });

        if (payload.eventType === 'UPDATE' && config.onUpdate) {
          config.onUpdate(payload);
        } else if (payload.eventType === 'INSERT' && config.onInsert) {
          config.onInsert(payload);
        } else if (payload.eventType === 'DELETE' && config.onDelete) {
          config.onDelete(payload);
        }
      });
    }

    // Set up connection timeout
    const timeoutId = setTimeout(() => {
      const state = channelsRef.current.get(channelName);
      if (state && state.status === 'CONNECTING') {
        console.warn('[SupabaseRealtimeProvider] Connection timeout:', channelName);
        state.status = 'TIMED_OUT';
        
        // Attempt retry if under limit
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
          console.log('[SupabaseRealtimeProvider] Scheduling retry:', { channelName, delay, retryCount: retryCount + 1 });
          
          setTimeout(async () => {
            await removeChannelAsync(channelName);
            subscribeWithRetry(channelName, config, retryCount + 1);
          }, delay);
        }
      }
    }, CONNECTION_TIMEOUT);

    // Subscribe to the channel
    channel.subscribe((status, err) => {
      clearTimeout(timeoutId);
      
      console.log('[SupabaseRealtimeProvider] Channel subscription status:', { channelName, status, error: err?.message });
      
      const state = channelsRef.current.get(channelName);
      if (!state) return;

      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        state.status = 'SUBSCRIBED';
        state.retryCount = 0; // Reset retry count on success
        setIsConnected(true);
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        state.status = 'CLOSED';
        
        // Attempt to reconnect if closed unexpectedly
        if (state.retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, state.retryCount);
          console.log('[SupabaseRealtimeProvider] Channel closed, reconnecting:', { channelName, delay });
          
          setTimeout(async () => {
            const currentConfig = configsRef.current.get(channelName);
            if (currentConfig) {
              await removeChannelAsync(channelName);
              subscribeWithRetry(channelName, currentConfig, state.retryCount + 1);
            }
          }, delay);
        }
      } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
        state.status = 'ERROR';
        console.error('[SupabaseRealtimeProvider] Channel error:', { channelName, error: err?.message });
        
        // Attempt to reconnect on error
        if (state.retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, state.retryCount);
          console.log('[SupabaseRealtimeProvider] Channel error, reconnecting:', { channelName, delay });
          
          setTimeout(async () => {
            const currentConfig = configsRef.current.get(channelName);
            if (currentConfig) {
              await removeChannelAsync(channelName);
              subscribeWithRetry(channelName, currentConfig, state.retryCount + 1);
            }
          }, delay);
        }
      } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        state.status = 'TIMED_OUT';
      }
    });

    return channel;
  }, [removeChannelAsync]);

  const subscribe = useCallback(
    (channelName: string, config: ChannelConfig): RealtimeChannel => {
      console.log('[SupabaseRealtimeProvider] Subscribe request:', { channelName, config });

      // Store config for potential reconnection
      configsRef.current.set(channelName, config);

      // If channel already exists, remove it first synchronously start removal
      const existingState = channelsRef.current.get(channelName);
      if (existingState) {
        console.log('[SupabaseRealtimeProvider] Existing channel found, removing first:', channelName);
        
        // Mark as closed immediately to prevent duplicate events
        existingState.status = 'CLOSED';
        
        // Remove asynchronously and then subscribe
        removeChannelAsync(channelName).then(() => {
          subscribeWithRetry(channelName, config, 0);
        });
        
        // Return a temporary channel that will be replaced
        // This handles the race condition by ensuring cleanup completes first
        return existingState.channel;
      }

      // No existing channel, create new one immediately
      return subscribeWithRetry(channelName, config, 0);
    },
    [removeChannelAsync, subscribeWithRetry]
  );

  const unsubscribe = useCallback(async (channelName: string) => {
    console.log('[SupabaseRealtimeProvider] Unsubscribe request:', channelName);
    configsRef.current.delete(channelName);
    await removeChannelAsync(channelName);
  }, [removeChannelAsync]);

  const getChannelStatus = useCallback((channelName: string): SubscriptionStatus | undefined => {
    return channelsRef.current.get(channelName)?.status;
  }, []);

  return (
    <SupabaseRealtimeContext.Provider value={{ isConnected, subscribe, unsubscribe, getChannelStatus }}>
      {children}
    </SupabaseRealtimeContext.Provider>
  );
}

export function useSupabaseRealtime() {
  const context = useContext(SupabaseRealtimeContext);
  if (!context) {
    throw new Error('useSupabaseRealtime must be used within SupabaseRealtimeProvider');
  }
  return context;
}
