# Deployment Guide

## Environment Variables

### Automatic Deployment (Current Setup)

Your project is configured to **automatically deploy environment variables** from `wrangler.jsonc`. 

**✅ You do NOT need to manually create variables** - they are automatically included when you deploy using:
```bash
npm run deploy
# or
wrangler deploy
# or  
wrangler versions upload
```

### How It Works

1. **Default Values**: All variables are defined in `wrangler.jsonc` with default values
2. **Automatic Inclusion**: When deploying with Wrangler CLI, these variables are automatically included
3. **Override Option**: You can optionally override values in Cloudflare Dashboard if needed

### When to Set Variables Manually

You only need to set variables manually in Cloudflare Dashboard if:

1. **You want different production values** than the defaults in `wrangler.jsonc`
2. **You have sensitive values** (API keys, secrets) that shouldn't be in the config file
3. **You're using Cloudflare Pages** (not Workers) - Pages requires manual variable setup

### Setting Variables in Cloudflare Dashboard (Optional)

If you need to override or add sensitive variables:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Workers & Pages** → Your Project → **Settings**
3. Click **Variables** tab
4. Add variables:
   - **Environment Variables**: For non-sensitive values
   - **Secrets**: For sensitive values (API keys, tokens, etc.)

### Current Variables in wrangler.jsonc

All these variables are automatically deployed:

**Branding & Identity:**
- `SITE_NAME`, `SITE_DOMAIN`, `SITE_URL`, `TWITTER_HANDLE`
- `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_DOMAIN`, etc.

**Analytics:**
- `GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`

**Application Settings:**
- `API_VERSION`, `SMTP_PROBE_HOSTNAME`, `PAGE_TITLE`, `PAGE_DESCRIPTION`

**Performance:**
- `DNS_TIMEOUT_MS`, `FETCH_TIMEOUT_MS`, `SMTP_TIMEOUT_MS`

**External Services:**
- `GEOLOCATION_API_URL`

**Cache & Retry:**
- `DEFAULT_CACHE_TTL_MS`, `GEO_CACHE_TTL_MS`, `DNSBL_CACHE_TTL_MS`
- `DEFAULT_RETRY_COUNT`, `DEFAULT_RETRY_DELAY_MS`

### Example: Setting Google Analytics

If you want to set your Google Analytics ID:

**Option 1: Update wrangler.jsonc** (recommended for non-sensitive values)
```jsonc
"vars": {
  "NEXT_PUBLIC_GA_MEASUREMENT_ID": "G-XXXXXXXXXX"
}
```

**Option 2: Set in Cloudflare Dashboard** (for sensitive values or overrides)
1. Go to Dashboard → Your Project → Settings → Variables
2. Add: `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXXXXX`

### Summary

✅ **Default behavior**: Variables from `wrangler.jsonc` are automatically deployed  
✅ **No manual setup needed** for standard deployments  
⚠️ **Manual setup only needed** for:
   - Overriding defaults with different production values
   - Setting sensitive secrets
   - Using Cloudflare Pages (not Workers)

