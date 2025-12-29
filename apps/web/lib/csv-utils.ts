/**
 * CSV utilities for parsing and generating CSV files (Frontend)
 */

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
}

/**
 * Parse CSV content into headers and rows
 */
export function parseCSV(content: string): CSVParseResult {
  const lines = content.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header line
  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error('CSV file is empty');
  }
  const headers = parseCSVLine(firstLine);
  
  // Parse data rows
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmedLine = line.trim();
    if (!trimmedLine) continue; // Skip empty lines
    
    const values = parseCSVLine(trimmedLine);
    const row: Record<string, unknown> = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      // Try to parse numbers and booleans
      row[header] = parseValue(value);
    });
    
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Parse value to appropriate type
 */
function parseValue(value: string): unknown {
  // Remove quotes if present
  value = value.replace(/^"(.*)"$/, '$1').trim();
  
  // Empty value
  if (value === '') return '';
  
  // Boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== '') {
    return num;
  }
  
  return value;
}

/**
 * Generate CSV content from headers and rows
 */
export function generateCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [];
  
  // Add header line
  lines.push(headers.map(escapeCSVValue).join(','));
  
  // Add data rows
  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If value contains comma, newline, or quotes, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Download CSV file
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Read CSV file from File object
 */
export function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Infer column data type from values
 */
export function inferDataType(values: unknown[]): string {
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  
  if (nonEmpty.length === 0) return 'text';
  
  // Check if all are numbers
  if (nonEmpty.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
    return 'number';
  }
  
  // Check if all are booleans
  if (nonEmpty.every(v => v === true || v === false || v === 'true' || v === 'false')) {
    return 'boolean';
  }
  
  // Check if values look like URLs
  const urlPattern = /^https?:\/\//i;
  if (nonEmpty.every(v => typeof v === 'string' && urlPattern.test(v))) {
    return 'url';
  }
  
  return 'text';
}
