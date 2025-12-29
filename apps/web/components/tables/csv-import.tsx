'use client';

import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV, readCSVFile, inferDataType } from '@/lib/csv-utils';

interface CSVImportProps {
  onImport: (data: { headers: string[]; rows: Record<string, unknown>[]; columnTypes: Record<string, string> }) => void;
  onCancel?: () => void;
}

export function CSVImport({ onImport, onCancel }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
    setError(null);
    
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    try {
      const content = await readCSVFile(selectedFile);
      const parsed = parseCSV(content);
      
      if (parsed.headers.length === 0) {
        setError('CSV file must have headers');
        return;
      }

      setFile(selectedFile);
      setPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 5) // Show first 5 rows as preview
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to parse CSV file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    try {
      const content = await readCSVFile(file);
      const { headers, rows } = parseCSV(content);
      
      // Infer column types
      const columnTypes: Record<string, string> = {};
      headers.forEach(header => {
        const values = rows.map(row => row[header]);
        columnTypes[header] = inferDataType(values);
      });

      onImport({ headers, rows, columnTypes });
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to import CSV');
    }
  };

  const resetFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-700 font-medium mb-2">
            Drop your CSV file here, or click to browse
          </p>
          <p className="text-sm text-gray-500">
            The first row should contain column headers
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-900 truncate">{file?.name}</p>
              <p className="text-sm text-green-700">
                {preview.headers.length} columns, {preview.rows.length}+ rows
              </p>
            </div>
            <button
              onClick={resetFile}
              className="p-1 hover:bg-green-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-green-700" />
            </button>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700">Preview (first 5 rows)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {preview.headers.map((header, i) => (
                      <th key={i} className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {preview.headers.map((header, j) => (
                        <td key={j} className="px-4 py-2 border-b border-gray-100 text-gray-600">
                          {String(row[header] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={onCancel || resetFile}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
