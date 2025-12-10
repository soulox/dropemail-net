/**
 * Site configuration - uses environment variables for dynamic configuration
 * Set these in Cloudflare dashboard or wrangler.jsonc
 */

// ============================================================================
// Branding & Identity
// ============================================================================

// Site name (e.g., "SafeCleanEmails")
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || process.env.SITE_NAME || 'SafeCleanEmails';

// Site domain (e.g., "safecleanemails.com")
export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || process.env.SITE_DOMAIN || 'safecleanemails.com';

// Site URL (full URL with protocol)
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || `https://${SITE_DOMAIN}`;

// Site display name (formatted version)
export const SITE_DISPLAY_NAME = `${SITE_NAME}.com`;

// Twitter handle (optional)
export const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || process.env.TWITTER_HANDLE || '@safecleanemails';

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

// Page Title
export const PAGE_TITLE = process.env.NEXT_PUBLIC_PAGE_TITLE || process.env.PAGE_TITLE || 'Email Security Analyzer';

// Page Description
export const PAGE_DESCRIPTION = process.env.NEXT_PUBLIC_PAGE_DESCRIPTION || process.env.PAGE_DESCRIPTION || 'Analyze email headers or domain security configuration';

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

