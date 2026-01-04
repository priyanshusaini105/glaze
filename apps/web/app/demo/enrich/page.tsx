"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EnrichmentResult = {
  rowId: string;
  columnId: string;
  originalValue: string | null;
  enrichedValue: string | null;
  status: "success" | "error";
  error?: string;
  metadata?: {
    source?: string;
    cost?: number;
    confidence?: number;
  };
};

export default function ContactEnrichmentDemo() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [error, setError] = useState("");

  const enrichContact = async () => {
    if (!linkedinUrl.trim()) {
      setError("Please enter a LinkedIn URL");
      return;
    }

    setLoading(true);
    setResults([]);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId: "demo_table",
          targets: [
            {
              type: "cells",
              selections: [
                {
                  rowId: "demo_row_1",
                  columnId: "person_email",
                  value: linkedinUrl,
                },
                {
                  rowId: "demo_row_1",
                  columnId: "person_phone",
                  value: linkedinUrl,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      
      console.log("Enrichment complete:", data);
    } catch (err) {
      console.error("Enrichment error:", err);
      setError(err instanceof Error ? err.message : "Failed to enrich contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            ✨ Enrichment Demo
          </h1>
          <p className="text-sm text-gray-600">
            Enrich data from various sources
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="linkedin" className="text-sm font-medium">
              LinkedIn Profile URL
            </label>
            <div className="flex gap-2">
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={enrichContact} disabled={loading}>
                {loading ? "Enriching..." : "✨ Enrich"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Results</h3>
              <div className="grid gap-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${
                      result.status === "success"
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {result.status === "success" ? "✅" : "❌"}
                          </span>
                          <span className="font-medium capitalize">
                            {result.columnId.replace("person_", "")}
                          </span>
                        </div>
                        
                        {result.status === "success" && result.enrichedValue ? (
                          <div className="pl-7">
                            <p className="text-sm text-gray-600">
                              Original: {result.originalValue || "N/A"}
                            </p>
                            <p className="text-lg font-semibold text-green-700">
                              {result.enrichedValue}
                            </p>
                            {result.metadata && (
                              <div className="flex gap-4 text-xs text-gray-600 mt-2">
                                <span>Source: {result.metadata.source}</span>
                                {result.metadata.confidence && (
                                  <span>Confidence: {result.metadata.confidence}%</span>
                                )}
                                {result.metadata.cost && (
                                  <span>Cost: {result.metadata.cost}¢</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-red-600 pl-7">
                            {result.error || "No data found"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Enter a LinkedIn profile URL</li>
              <li>Click &quot;Enrich&quot; to fetch information</li>
              <li>Multiple sources provide data enrichment</li>
              <li>Results show enriched details with confidence scores</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">💡 API Architecture</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
              <li>✅ Input validation & rate limiting</li>
              <li>✅ Multiple API integrations with retry logic</li>
              <li>✅ Data normalization & error handling</li>
              <li>✅ Cost tracking</li>
              <li>⏭️ PostgreSQL logging (optional for MVP)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
