'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DataType } from '../../lib/api-types';

interface ColumnAnalysis {
  suggestedType: DataType;
  category: string;
  confidence: number;
  reasoning: string;
}

interface ColumnCreationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    label: string;
    dataType: DataType;
    category?: string;
    description?: string;
  }) => Promise<void>;
  isSaving?: boolean;
  tableName?: string;
}

const DATA_TYPES: { value: DataType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'boolean', label: 'Boolean', icon: '✓' },
];

export function ColumnCreationSidebar({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  tableName,
}: ColumnCreationSidebarProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState<DataType>('text');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ColumnAnalysis | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => labelInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // AI analysis when label or description changes
  const analyzeColumn = useCallback(async (currentLabel: string, currentDescription: string) => {
    if (!currentLabel.trim() || currentLabel.trim().length < 2) {
      setAnalysis(null);
      setShowAISuggestions(false);
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:3001/ai/columns/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: currentLabel,
          description: currentDescription || undefined,
          context: tableName ? `Table: ${tableName}` : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze column');
      }

      const result = await response.json();
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        setShowAISuggestions(true);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [tableName]);

  // Debounced AI analysis
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (label.trim()) {
        analyzeColumn(label, description);
      }
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [label, description, analyzeColumn]);

  const handleApplyAISuggestions = useCallback(() => {
    if (!analysis) return;
    setDataType(analysis.suggestedType);
    setCategory(analysis.category);
    setShowAISuggestions(false);
  }, [analysis]);

  const handleSave = useCallback(async () => {
    if (!label.trim()) {
      setError('Please enter a column name');
      return;
    }

    setError(null);
    try {
      await onSave({
        label: label.trim(),
        dataType,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
      });
      
      // Reset form
      setLabel('');
      setDescription('');
      setDataType('text');
      setCategory('');
      setAnalysis(null);
      setShowAISuggestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save column');
    }
  }, [label, dataType, category, description, onSave]);

  const handleClose = useCallback(() => {
    setLabel('');
    setDescription('');
    setDataType('text');
    setCategory('');
    setError(null);
    setAnalysis(null);
    setShowAISuggestions(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">Create Column</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Column Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Column Name *
            </label>
            <Input
              ref={labelInputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Company Name"
              className="w-full"
              disabled={isSaving}
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this column contains..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* AI Suggestions */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-md">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing with AI...</span>
            </div>
          )}

          {showAISuggestions && analysis && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">AI Suggestions</span>
                </div>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                  {Math.round(analysis.confidence * 100)}% confident
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Type:</span>{' '}
                  <span className="font-medium text-slate-900">{analysis.suggestedType}</span>
                </div>
                <div>
                  <span className="text-slate-600">Category:</span>{' '}
                  <span className="font-medium text-slate-900">{analysis.category}</span>
                </div>
                <p className="text-xs text-slate-600 italic mt-2">
                  {analysis.reasoning}
                </p>
              </div>

              <Button
                onClick={handleApplyAISuggestions}
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply Suggestions
              </Button>
            </div>
          )}

          {/* Data Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Data Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DATA_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDataType(type.value)}
                  disabled={isSaving}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md border transition-all
                    ${dataType === type.value
                      ? 'bg-purple-50 border-purple-500 text-purple-900 font-medium'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                    }
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category (optional)
            </label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., contact, company, financial"
              className="w-full"
              disabled={isSaving}
            />
            <p className="text-xs text-slate-500 mt-1">
              Semantic meaning to help organize and search columns
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isSaving || !label.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Column'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
