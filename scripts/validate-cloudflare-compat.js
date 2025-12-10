#!/usr/bin/env node

/**
 * Validation script to ensure code changes are Cloudflare Workers compatible
 * Run with: node scripts/validate-cloudflare-compat.js
 */

const fs = require('fs');
const path = require('path');

let errors = [];
let warnings = [];

function checkFile(filePath, content) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check for environment variables without fallbacks
  const envVarPattern = /process\.env\.([A-Z_]+)(?!\s*\|\|)/g;
  const matches = content.match(envVarPattern);
  if (matches) {
    matches.forEach(match => {
      // Allow NEXT_PUBLIC_ vars in client components (they're replaced at build time)
      if (!match.includes('NEXT_PUBLIC_') && !content.includes('use client')) {
        warnings.push(`${relativePath}: Potential unsafe env var access: ${match}`);
      }
    });
  }
  
  // Check for hardcoded URLs (should use config)
  const urlPattern = /https?:\/\/[^\s'"]+/g;
  const urls = content.match(urlPattern);
  if (urls) {
    urls.forEach(url => {
      // Allow common CDN URLs and known safe URLs
      const safeUrls = ['googletagmanager.com', 'schema.org', 'imagedelivery.net'];
      const isSafe = safeUrls.some(safe => url.includes(safe));
      if (!isSafe && !content.includes('site-config') && !content.includes('GEOLOCATION_API_URL')) {
        warnings.push(`${relativePath}: Hardcoded URL found: ${url} - consider using config`);
      }
    });
  }
  
  // Check for fs operations (not available in Workers)
  if (content.includes('require(\'fs\')') || content.includes('import fs') || content.includes('from \'fs\'')) {
    errors.push(`${relativePath}: File system operations not available in Cloudflare Workers`);
  }
  
  // Check for blocking operations
  if (content.includes('readFileSync') || content.includes('writeFileSync')) {
    errors.push(`${relativePath}: Synchronous file operations not available in Cloudflare Workers`);
  }
  
  // Check for process.cwd() or __dirname (problematic in Workers)
  if (content.includes('process.cwd()') || content.includes('__dirname')) {
    warnings.push(`${relativePath}: process.cwd() or __dirname usage may not work as expected in Workers`);
  }
  
  // Check API routes have runtime declaration
  if (filePath.includes('/api/') && filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
    if (content.includes('node:dns') || content.includes('node:net') || content.includes('node:tls')) {
      if (!content.includes('export const runtime')) {
        errors.push(`${relativePath}: API route using Node.js APIs must declare 'export const runtime = \\'nodejs\\''`);
      }
    }
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip node_modules, .next, and other build directories
    if (file.startsWith('.') && file !== '.cursorrules') return;
    if (file === 'node_modules' || file === '.next' || file === '.open-next') return;
    
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

console.log('🔍 Validating Cloudflare Workers compatibility...\n');

const srcDir = path.join(process.cwd(), 'src');
if (!fs.existsSync(srcDir)) {
  console.error('❌ src directory not found');
  process.exit(1);
}

const files = walkDir(srcDir);
files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    checkFile(file, content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});

// Check site-config.ts exists and has proper structure
const configPath = path.join(process.cwd(), 'src', 'lib', 'site-config.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  if (!configContent.includes('process.env')) {
    warnings.push('site-config.ts: No environment variables found');
  }
} else {
  warnings.push('site-config.ts not found - configuration should be centralized');
}

// Check wrangler.jsonc exists
const wranglerPath = path.join(process.cwd(), 'wrangler.jsonc');
if (!fs.existsSync(wranglerPath)) {
  warnings.push('wrangler.jsonc not found - environment variables should be defined here');
}

// Report results
console.log(`📊 Scanned ${files.length} files\n`);

if (errors.length > 0) {
  console.error('❌ ERRORS (must be fixed):');
  errors.forEach(err => console.error(`  - ${err}`));
  console.error('');
}

if (warnings.length > 0) {
  console.warn('⚠️  WARNINGS (should be reviewed):');
  warnings.forEach(warn => console.warn(`  - ${warn}`));
  console.warn('');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Code appears to be Cloudflare Workers compatible.\n');
  process.exit(0);
} else if (errors.length > 0) {
  console.error('❌ Validation failed. Please fix the errors above.\n');
  process.exit(1);
} else {
  console.log('✅ No critical errors found. Please review warnings.\n');
  process.exit(0);
}

