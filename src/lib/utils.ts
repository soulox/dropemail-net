import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  // Handle date strings from JSON responses
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  try {
    // Try with timeZoneName first
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
          }).format(dateObj);
        } catch {
          try {
      // Fallback without timeZoneName if it causes issues
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }).format(dateObj);
    } catch {
      // Final fallback to basic formatting
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function parseEmailAddress(address: string): { name?: string; address: string } {
  // Simple parser for email addresses
  const match = address.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      address: match[2].trim(),
    };
  }
  return { address: address.trim() };
}

export function decodeHeader(header: string): string {
  // Decode RFC 2047 encoded headers (=?charset?encoding?text?=)
  return header.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (match, charset, encoding, text) => {
    try {
      if (encoding === 'B') {
        // Base64 decoding - works in both browser and Node.js
        let decoded: string;
        if (typeof window !== 'undefined' && typeof atob !== 'undefined') {
          // Browser environment
          decoded = atob(text);
        } else {
          // Node.js environment (API route) - use Buffer
          // Dynamic import for Buffer in Node.js environment
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
          const NodeBuffer = require('buffer').Buffer;
          decoded = NodeBuffer.from(text, 'base64').toString('latin1');
        }
        
        // Handle charset conversion (UTF-8 is most common)
        if (charset.toLowerCase() === 'utf-8' || charset.toLowerCase().includes('utf')) {
          try {
            // Try to decode as UTF-8
            return new TextDecoder('utf-8').decode(
              new Uint8Array([...decoded].map(c => c.charCodeAt(0)))
            );
          } catch {
            return decoded;
          }
        }
        return decoded;
      } else if (encoding === 'Q') {
        return text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
      }
    } catch {
      return match;
    }
    return match;
  });
}

