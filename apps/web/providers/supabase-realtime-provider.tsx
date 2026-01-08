'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SupabaseRealtimeContextValue {
  isConnected: boolean;
  subscribe: (channelName: string, config: ChannelConfig) => RealtimeChannel;
  unsubscribe: (channelName: string) => void;
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

export function SupabaseRealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    // Check connection status
    const checkConnection = () => {
      const status = supabase.realtime.channels.length > 0;
      setIsConnected(status);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
      // Clean up all channels on unmount
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const subscribe = useCallback(
    (channelName: string, config: ChannelConfig): RealtimeChannel => {
      console.log('[SupabaseRealtimeProvider] Subscribing to channel:', { channelName, config });
      
      // If channel already exists, remove it first
      const existingChannel = channelsRef.current.get(channelName);
      if (existingChannel) {
        console.log('[SupabaseRealtimeProvider] Removing existing channel:', channelName);
        supabase.removeChannel(existingChannel);
      }

      // Create new channel
      const channel = supabase.channel(channelName);

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
          console.log('[SupabaseRealtimeProvider] postgres_changes event:', { 
            channelName, 
            eventType: payload.eventType, 
            table: config.table,
            hasNew: !!payload.new,
            hasOld: !!payload.old 
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

      // Subscribe to the channel
      channel.subscribe((status) => {
        console.log('[SupabaseRealtimeProvider] Channel subscription status:', { channelName, status });
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

      // Store the channel in ref
      channelsRef.current.set(channelName, channel);

      return channel;
    },
    []
  );

  const unsubscribe = useCallback((channelName: string) => {
    const channel = channelsRef.current.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    }
  }, []);

  return (
    <SupabaseRealtimeContext.Provider value={{ isConnected, subscribe, unsubscribe }}>
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
