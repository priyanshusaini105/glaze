/**
 * CSV utilities for parsing and generating CSV files
 */

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, any>[];
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
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    const row: Record<string, any> = {};
    
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
function parseValue(value: string): any {
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
export function generateCSV(headers: string[], rows: Record<string, any>[]): string {
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
function escapeCSVValue(value: any): string {
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
 * Infer column data type from values
 */
export function inferDataType(values: any[]): string {
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
