# Cloudflare Workers Compatibility Guide

This document outlines the requirements and best practices for ensuring all code changes are compatible with Cloudflare Workers deployment.

## Quick Reference

### ✅ Always Do
- Use fallback defaults for all environment variables
- Centralize configuration in `src/lib/site-config.ts`
- Use timeouts from `site-config.ts` for all I/O operations
- Set `export const runtime = 'nodejs'` in API routes using Node.js APIs
- Use `@/` alias for all imports from `src/`
- Handle errors gracefully with try/catch
- Use async/await for all I/O operations

### ❌ Never Do
- Access environment variables without fallbacks
- Use `fs.readFileSync` or file system operations
- Use blocking operations without timeouts
- Hardcode configuration values
- Use `require()` for dynamic imports
- Access `process.env` directly without defaults

## Environment Variables Pattern

```typescript
// ✅ Correct pattern
export const CONFIG_VALUE = 
  process.env.NEXT_PUBLIC_CONFIG_VALUE || 
  process.env.CONFIG_VALUE || 
  'default-value';

// For numeric values
export const NUMERIC_VALUE = 
  parseInt(String(process.env.NUMERIC_VALUE || '100'), 10) || 100;
```

## API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TIMEOUT_MS } from '@/lib/site-config';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Use timeout from config
    const result = await fetchWithTimeout(url, TIMEOUT_MS);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## Configuration Management

1. **Add to site-config.ts**:
```typescript
export const NEW_CONFIG = process.env.NEW_CONFIG || 'default';
```

2. **Add to wrangler.jsonc**:
```jsonc
"vars": {
  "NEW_CONFIG": "default-value",
  "NEXT_PUBLIC_NEW_CONFIG": "default-value" // if needed client-side
}
```

## Testing Checklist

Before committing:
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] All env vars have fallbacks
- [ ] Configuration added to wrangler.jsonc
- [ ] Timeouts used for I/O operations
- [ ] Error handling present

## Deployment

### Environment Variables Deployment

**For Cloudflare Workers (using Wrangler CLI):**
- ✅ Variables in `wrangler.jsonc` under `vars` are **automatically deployed**
- When you run `npm run deploy` or `wrangler deploy`, all variables from `wrangler.jsonc` are included
- **No manual setup needed** - the variables are part of the deployment

**For Cloudflare Pages (via Dashboard/GitHub):**
- ⚠️ Variables need to be set **manually** in Cloudflare Dashboard
- Go to: Workers & Pages → Your Project → Settings → Environment Variables
- Add each variable from `wrangler.jsonc` manually
- Or use `wrangler pages secret put` command for sensitive values

**Current Setup:**
Your project uses `wrangler versions upload`, which means:
- Variables from `wrangler.jsonc` are **automatically included** in deployment
- Default values will be used if not overridden in Dashboard
- You can override specific values in Cloudflare Dashboard if needed

### Recommended Approach

1. **Default values** in `wrangler.jsonc` work automatically ✅
2. **Override in Dashboard** only if you need different production values
3. **Sensitive values** (like API keys) should be set as secrets in Dashboard

### Setting Variables in Cloudflare Dashboard (Optional Override)

If you want to override defaults:
1. Go to Cloudflare Dashboard
2. Navigate to: Workers & Pages → Your Project → Settings
3. Click "Variables" tab
4. Add/Edit variables as needed
5. These will override `wrangler.jsonc` values

