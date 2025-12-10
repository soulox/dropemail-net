/**
 * Site configuration - only domain name is dynamic via environment variable
 * Set SITE_DOMAIN in Cloudflare dashboard or wrangler.jsonc
 */

// ============================================================================
// Domain Configuration (ONLY dynamic value)
// ============================================================================

// Site domain (e.g., "safecleanemails.com") - ONLY value from environment variable
export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || process.env.SITE_DOMAIN || 'safecleanemails.com';

// ============================================================================
// Derived Values (computed from domain)
// ============================================================================

// Site URL (full URL with protocol) - derived from domain
export const SITE_URL = `https://${SITE_DOMAIN}`;

// Site name - derived from domain (removes .com and capitalizes)
export const SITE_NAME = SITE_DOMAIN
  .replace(/\.(com|net|org|io|co|dev)$/i, '')
  .split(/[-.]/)
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join('');

// Site display name (formatted version) - derived from domain
export const SITE_DISPLAY_NAME = SITE_DOMAIN;

// Twitter handle - derived from domain
export const TWITTER_HANDLE = `@${SITE_DOMAIN.replace(/\.(com|net|org|io|co|dev)$/i, '')}`;

// ============================================================================
// Analytics & Tracking
// ============================================================================

// Google Analytics Measurement ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID || '';

// ============================================================================
// Application Settings
// ============================================================================

// API Version
export const API_VERSION = process.env.API_VERSION || '1.2.0';

// SMTP Probe Hostname (used in EHLO commands)
export const SMTP_PROBE_HOSTNAME = process.env.SMTP_PROBE_HOSTNAME || 'probe.dropemail';

// Page Title - hardcoded
export const PAGE_TITLE = 'Email Security Analyzer';

// Page Description - hardcoded
export const PAGE_DESCRIPTION = 'Analyze email headers or domain security configuration';

// ============================================================================
// Timeouts & Performance
// ============================================================================

// DNS resolution timeout (milliseconds)
export const DNS_TIMEOUT_MS = parseInt(String(process.env.DNS_TIMEOUT_MS || '3000'), 10) || 3000;

// HTTP fetch timeout (milliseconds)
export const FETCH_TIMEOUT_MS = parseInt(String(process.env.FETCH_TIMEOUT_MS || '5000'), 10) || 5000;

// SMTP connection timeout (milliseconds)
export const SMTP_TIMEOUT_MS = parseInt(String(process.env.SMTP_TIMEOUT_MS || '4000'), 10) || 4000;

// ============================================================================
// External Services
// ============================================================================

// Geolocation API URL (supports {ip} placeholder)
export const GEOLOCATION_API_URL = process.env.GEOLOCATION_API_URL || 'https://ipapi.co/{ip}/json/';

// ============================================================================
// Cache Settings
// ============================================================================

// Default cache TTL (milliseconds) - 10 minutes
export const DEFAULT_CACHE_TTL_MS = parseInt(String(process.env.DEFAULT_CACHE_TTL_MS || '600000'), 10) || 600000;

// Geo cache TTL (milliseconds) - 1 hour
export const GEO_CACHE_TTL_MS = parseInt(String(process.env.GEO_CACHE_TTL_MS || '3600000'), 10) || 3600000;

// DNSBL cache TTL (milliseconds) - 10 minutes
export const DNSBL_CACHE_TTL_MS = parseInt(String(process.env.DNSBL_CACHE_TTL_MS || '600000'), 10) || 600000;

// ============================================================================
// Retry Settings
// ============================================================================

// Default retry count
export const DEFAULT_RETRY_COUNT = parseInt(String(process.env.DEFAULT_RETRY_COUNT || '2'), 10) || 2;

// Default retry base delay (milliseconds)
export const DEFAULT_RETRY_DELAY_MS = parseInt(String(process.env.DEFAULT_RETRY_DELAY_MS || '200'), 10) || 200;

