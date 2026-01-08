'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestRealtimePage() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus('Setting up channel...');

    // Test postgres_changes subscription
    const channel = supabase
      .channel('test-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rows',
        },
        (payload) => {
          console.log('🎉 Realtime event received!', payload);
          setEvents((prev) => [...prev, {
            time: new Date().toISOString(),
            event: payload.eventType,
            data: payload.new || payload.old,
          }]);
        }
      )
      .subscribe((subscribeStatus, err) => {
        console.log('Subscription status:', subscribeStatus, err);
        
        if (err) {
          setError(err.message);
          setStatus(`Error: ${err.message}`);
        } else if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('✅ SUBSCRIBED - Listening for changes');
        } else if (subscribeStatus === 'CHANNEL_ERROR') {
          setStatus('❌ CHANNEL_ERROR - Check your Supabase setup');
        } else if (subscribeStatus === 'TIMED_OUT') {
          setStatus('❌ TIMED_OUT - Connection failed');
        } else {
          setStatus(`Status: ${subscribeStatus}`);
        }
      });

    return () => {
      console.log('Cleaning up channel...');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Realtime Test Page</h1>
      
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <p className={`text-lg font-mono ${
          status.includes('SUBSCRIBED') ? 'text-green-600' : 
          status.includes('Error') || status.includes('❌') ? 'text-red-600' : 
          'text-yellow-600'
        }`}>
          {status}
        </p>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">How to Test</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Keep this page open</li>
          <li>Open another tab with your table page</li>
          <li>Update any cell in the table</li>
          <li>Come back here - you should see the event below</li>
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          <strong>Alternative:</strong> Open the Supabase dashboard, go to Table Editor, 
          and manually edit a row in the <code className="bg-white px-1 py-0.5 rounded">rows</code> table.
        </p>
      </div>

      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">
          Events Received ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="text-gray-500 italic">
            No events yet. Try updating a row in your table...
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {events.map((event, idx) => (
              <div
                key={idx}
                className="p-3 bg-green-50 border border-green-200 rounded text-sm font-mono"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-green-700">{event.event}</span>
                  <span className="text-gray-500 text-xs">{event.time}</span>
                </div>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">⚠️ Troubleshooting</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>If status is stuck on "Initializing" - check browser console for errors</li>
          <li>If you get "CHANNEL_ERROR" - verify your Supabase credentials in .env.local</li>
          <li>If subscribed but no events - Supabase Realtime might need configuration</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ul>
      </div>
    </div>
  );
}
