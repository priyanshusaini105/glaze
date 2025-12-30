/**
 * Effect Enrichment Demo Page
 * 
 * Demonstrates the waterfall enrichment pattern with Effect TS
 */

'use client';

import { useState } from 'react';
import { api, type EnrichmentResponse } from '@/lib/eden-client';

export default function EffectEnrichmentDemo() {
  const [url, setUrl] = useState('https://example.com');
  const [budgetCents, setBudgetCents] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichmentResponse | null>(null);

  const handleEnrich = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await api.effect.enrich.post({
        url,
        userId: 'demo-user',
        budgetCents,
      });

      if (response.data) {
        setResult(response.data as EnrichmentResponse);
      } else if (response.error) {
        setResult({
          success: false,
          error: 'RequestFailed',
          message: String(response.error),
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'NetworkError',
        message: error instanceof Error ? error.message : 'Failed to connect to API',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchEnrich = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await api.effect.demo.batch.post({
        urls: [
          'https://example1.com',
          'https://example2.com',
          'https://example3.com',
        ],
        budgetPerUrl: budgetCents,
      });

      if (response.data) {
        setResult(response.data as any);
      } else if (response.error) {
        setResult({
          success: false,
          error: 'RequestFailed',
          message: String(response.error),
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'NetworkError',
        message: error instanceof Error ? error.message : 'Failed to connect to API',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">
              Effect TS Enrichment Demo
            </h1>
            <p className="mt-2 text-blue-100">
              Waterfall pattern with automatic retries and type-safe error handling
            </p>
          </div>

          {/* Form */}
          <div className="px-6 py-8 space-y-6">
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700"
              >
                URL to Enrich
              </label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label
                htmlFor="budget"
                className="block text-sm font-medium text-gray-700"
              >
                Budget (cents)
              </label>
              <input
                type="number"
                id="budget"
                value={budgetCents}
                onChange={(e) => setBudgetCents(Number(e.target.value))}
                min="10"
                max="1000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">
                Provider costs: A=10¢, B=25¢, C=50¢
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleEnrich}
                disabled={loading || !url}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enriching...' : 'Enrich Single URL'}
              </button>

              <button
                onClick={handleBatchEnrich}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Batch Demo (3 URLs)'}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="px-6 pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Result
              </h2>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.success && 'result' in result && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900">
                      Provider
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {result.result.provider}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900">Cost</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {result.result.costCents}¢
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-900">
                      Attempts
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {result.result.attempts}
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-orange-900">
                      Success
                    </p>
                    <p className="text-2xl font-bold text-orange-700">
                      {result.result.success ? '✓' : '✗'}
                    </p>
                  </div>
                </div>
              )}

              {!result.success && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-red-700">
                    {'error' in result && result.error}:{' '}
                    {'message' in result && result.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              How it works
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Tries Provider A first (cheap, unreliable)</li>
              <li>• Falls back to Provider B if A fails (moderate)</li>
              <li>• Falls back to Provider C if B fails (expensive, reliable)</li>
              <li>• Each provider has automatic retries with exponential backoff</li>
              <li>• All errors are handled via Effect TS (no try/catch)</li>
              <li>• Type-safe communication via Elysia Eden</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
