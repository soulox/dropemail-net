import { simpleParser, ParsedMail } from 'mailparser';
import { NextRequest, NextResponse } from 'next/server';
import { EmailAnalysis, EmailAddress, AuthResult, ReceivedHeader, SecurityAnalysis, Attachment } from '@/types/email';
import { parseEmailAddress, decodeHeader } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { emailText?: string };
    const { emailText } = body;
    
    if (!emailText || typeof emailText !== 'string') {
      return NextResponse.json(
        { error: 'Email text is required' },
        { status: 400 }
      );
    }

    const analysis = await parseEmailText(emailText);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Email parsing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse email' },
      { status: 500 }
    );
  }
}

async function parseEmailText(text: string): Promise<EmailAnalysis> {
  try {
    const parsed = await simpleParser(text);
    return analyzeEmail(parsed, text);
  } catch (error) {
    // If parsing fails, try parsing as headers only
    return parseHeadersOnly(text);
  }
}

function analyzeEmail(parsed: ParsedMail, raw: string): EmailAnalysis {
  // Extract summary
  const summary = {
    subject: parsed.subject || '(No Subject)',
    from: parseEmailAddress(parsed.from?.text || parsed.from?.value?.[0]?.address || 'unknown'),
    to: parseAddresses(parsed.to),
    cc: parsed.cc ? parseAddresses(parsed.cc) : undefined,
    bcc: parsed.bcc ? parseAddresses(parsed.bcc) : undefined,
    date: parsed.date || new Date(),
    messageId: parsed.messageId || '',
  };

  // Extract authentication results
  const authentication = extractAuthentication(parsed.headers);

  // Extract routing information
  const routing = extractRouting(parsed.headers);

  // Security analysis
  const security = analyzeSecurity(parsed.headers);

  // Extract all headers
  const headers: Record<string, string | string[]> = {};
  parsed.headers.forEach((value, key) => {
    // Convert value to string or string array
    if (Array.isArray(value)) {
      headers[key] = value.map(v => String(v));
    } else if (value instanceof Date) {
      headers[key] = value.toISOString();
    } else {
      headers[key] = String(value);
    }
  });

  // Extract attachments
  const attachments = parsed.attachments?.map(att => ({
    filename: att.filename || 'unknown',
    contentType: att.contentType || 'application/octet-stream',
    size: att.size || 0,
    contentId: att.contentId,
  }));

  return {
    summary,
    authentication,
    routing,
    security,
    headers,
    attachments,
    rawHeaders: extractRawHeaders(raw),
  };
}

function parseHeadersOnly(text: string): EmailAnalysis {
  const lines = text.split('\n');
  const headers: Record<string, string | string[]> = {};
  let currentHeader = '';
  let currentValue = '';

  // Parse headers
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('---')) {
      break; // End of headers
    }
    
    if (/^[A-Za-z-]+:/.test(line)) {
      if (currentHeader) {
        headers[currentHeader] = currentValue.trim();
      }
      const match = line.match(/^([A-Za-z-]+):\s*(.+)$/);
      if (match) {
        currentHeader = match[1];
        currentValue = match[2];
      }
    } else if (currentHeader && /^\s/.test(line)) {
      // Continuation line
      currentValue += ' ' + line.trim();
    }
  }
  
  if (currentHeader) {
    headers[currentHeader] = currentValue.trim();
  }

  // Extract basic info
  const subject = decodeHeader(headers['Subject'] as string || '(No Subject)');
  const from = parseEmailAddress(headers['From'] as string || 'unknown');
  const to = parseAddresses(headers['To'] as string || '');

  return {
    summary: {
      subject,
      from,
      to,
      date: parseDate(headers['Date'] as string) || new Date(),
      messageId: headers['Message-ID'] as string || '',
    },
    authentication: extractAuthenticationFromHeaders(headers),
    routing: extractRoutingFromHeaders(headers),
    security: analyzeSecurity(headers),
    headers,
    rawHeaders: text,
  };
}

function parseAddresses(value: any): EmailAddress[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(',').map(addr => parseEmailAddress(addr.trim()));
  }
  if (Array.isArray(value)) {
    return value.flatMap(v => {
      if (typeof v === 'string') {
        return v.split(',').map(addr => parseEmailAddress(addr.trim()));
      }
      return [{ address: v.address || v.text || 'unknown' }];
    });
  }
  if (value.value) {
    return value.value.map((v: any) => ({
      name: v.name,
      address: v.address,
    }));
  }
  return [];
}

function extractAuthentication(headers: Map<string, any>): {
  spf: AuthResult;
  dkim: AuthResult;
  dmarc: AuthResult;
  arc?: AuthResult;
} {
  // Collect all Authentication-Results headers (most recent first)
  const authResults: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authentication-results') {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((v: any) => {
        authResults.push(String(v));
      });
    }
  });

  // Use the most recent (first) Authentication-Results header
  // Join all if needed, but typically we want the most recent one
  const authString = authResults.length > 0 ? authResults[0] : '';
  
  const headersObj: Record<string, string | string[]> = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  return {
    spf: extractSPF(authString, headersObj),
    dkim: extractDKIM(authString, headersObj),
    dmarc: extractDMARC(authString, headersObj),
    arc: extractARC(authString, headersObj),
  };
}

function extractAuthenticationFromHeaders(headers: Record<string, string | string[]>): {
  spf: AuthResult;
  dkim: AuthResult;
  dmarc: AuthResult;
  arc?: AuthResult;
} {
  // Collect all Authentication-Results headers (most recent first)
  const authResults: string[] = [];
  Object.entries(headers).forEach(([key, value]) => {
    if (key.toLowerCase() === 'authentication-results') {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((v: string) => {
        authResults.push(String(v));
      });
    }
  });

  // Use the most recent (first) Authentication-Results header
  const authString = authResults.length > 0 ? authResults[0] : '';

  return {
    spf: extractSPF(authString, headers),
    dkim: extractDKIM(authString, headers),
    dmarc: extractDMARC(authString, headers),
    arc: extractARC(authString, headers),
  };
}

function extractSPF(authString: string, headers: Record<string, string | string[]>): AuthResult {
  // Try Authentication-Results header
  // Format: spf=pass smtp.mailfrom=example.com or spf=pass (example.com) or spf=pass
  const spfPatterns = [
    // spf=pass smtp.mailfrom=example.com
    /spf=([^\s;]+)(?:\s+smtp\.mailfrom=([^\s;]+))?/i,
    // spf=pass (example.com)
    /spf=([^\s;]+)\s*\(([^)]+)\)/i,
    // Simple spf=pass
    /spf=([^\s;]+)/i,
  ];

  for (let i = 0; i < spfPatterns.length; i++) {
    const pattern = spfPatterns[i];
    const match = authString.match(pattern);
    if (match) {
      const status = match[1]?.toLowerCase();
      if (status && normalizeStatus(status) !== 'none') {
        // Pattern 1: spf=pass smtp.mailfrom=example.com
        // Pattern 2: spf=pass (example.com) - domain in parentheses
        // Pattern 3: spf=pass - status only
        const domain = i === 0 ? match[2] : (i === 1 ? match[2] : undefined);
        return {
          status: normalizeStatus(status),
          domain: domain || undefined,
        };
      }
    }
  }

  // Try Received-SPF header
  const receivedSPF = headers['Received-SPF'] || headers['received-spf'];
  
  if (receivedSPF) {
    const spfStr = Array.isArray(receivedSPF) ? receivedSPF[0] : String(receivedSPF);
    // Format: pass (example.com) or Pass (example.com) reason="..."
    const match = spfStr.match(/(pass|fail|neutral|softfail|temperror|permerror|none)/i);
    const domainMatch = spfStr.match(/\(([^)]+)\)/);
    if (match) {
      return {
        status: normalizeStatus(match[1]),
        domain: domainMatch ? domainMatch[1] : undefined,
      };
    }
  }

  // Check spam-related headers for SPF info (e.g., X-SmarterMail-Spam: SPF [Pass])
  const spamHeaders = ['X-SmarterMail-Spam', 'X-Spam-Status', 'X-Spam-Checker-Version'];
  for (const headerName of spamHeaders) {
    const spamHeader = headers[headerName] || headers[headerName.toLowerCase()];
    if (spamHeader) {
      const spamStr = Array.isArray(spamHeader) ? spamHeader.join(' ') : String(spamHeader);
      const spfMatch = spamStr.match(/SPF\s*\[(Pass|Fail|Neutral|SoftFail|TempError|PermError|None)\]/i);
      if (spfMatch) {
        return {
          status: normalizeStatus(spfMatch[1]),
        };
      }
    }
  }

  return { status: 'none' };
}

function extractDKIM(authString: string, headers: Record<string, string | string[]>): AuthResult {
  // Try Authentication-Results header
  // Format: dkim=pass header.d=example.com or dkim=pass (example.com) or dkim=pass header.i=@example.com
  const dkimPatterns = [
    // dkim=pass header.d=example.com header.s=selector
    /dkim=([^\s;]+)(?:\s+header\.d=([^\s;]+))?(?:\s+header\.s=([^\s;]+))?/i,
    // dkim=pass (example.com)
    /dkim=([^\s;]+)\s*\(([^)]+)\)/i,
    // Simple dkim=pass
    /dkim=([^\s;]+)/i,
  ];

  for (const pattern of dkimPatterns) {
    const match = authString.match(pattern);
    if (match) {
      const status = match[1]?.toLowerCase();
      const domain = match[2];
      const selector = match[3];
      if (status && normalizeStatus(status) !== 'none') {
        return {
          status: normalizeStatus(status),
          selector: selector || undefined,
          domain: domain || undefined,
        };
      }
    }
  }

  // Check for DKIM-Signature header - if present, at least try to extract selector
  const dkimSig = headers['DKIM-Signature'] || headers['dkim-signature'];
  
  if (dkimSig) {
    const dkimStr = Array.isArray(dkimSig) ? dkimSig[0] : String(dkimSig);
    const selectorMatch = dkimStr.match(/s=([^;\s]+)/);
    const domainMatch = dkimStr.match(/d=([^;\s]+)/);
    return {
      status: 'none', // Can't verify from signature alone
      selector: selectorMatch ? selectorMatch[1] : undefined,
      domain: domainMatch ? domainMatch[1] : undefined,
    };
  }

  return { status: 'none' };
}

function extractDMARC(authString: string, headers: Record<string, string | string[]>): AuthResult {
  // Collect all possible header sources
  const searchStrings: string[] = [];
  
  // Add provided authString
  if (authString) {
    searchStrings.push(authString);
  }
  
  // Check all Authentication-Results headers (case-insensitive, various formats)
  Object.keys(headers).forEach(key => {
    const keyLower = key.toLowerCase();
    if (keyLower === 'authentication-results' || 
        keyLower === 'authenticationresults' ||
        keyLower.includes('authentication')) {
      const value = headers[key];
      if (Array.isArray(value)) {
        value.forEach(v => searchStrings.push(String(v)));
      } else {
        searchStrings.push(String(value));
      }
    }
  });
  
  // Search through all collected strings
  for (const searchStr of searchStrings) {
    if (!searchStr) continue;
    
    // More flexible DMARC pattern matching - handle various formats
    // Examples: dmarc=pass, dmarc=pass; dmarc=pass (domain), dmarc=pass header.from=domain
    const dmarcPatterns = [
      // Standard: dmarc=pass header.from=example.com policy.p=quarantine
      /dmarc\s*=\s*([^\s;,)]+)/i,
    ];
    
    for (const pattern of dmarcPatterns) {
      const match = searchStr.match(pattern);
      if (match) {
        let status = match[1].toLowerCase().trim();
        
        // Handle variations
        if (status.includes('pass')) {
          status = 'pass';
        } else if (status.includes('fail')) {
          status = status.startsWith('soft') ? 'softfail' : 'fail';
        } else if (status.includes('neutral')) {
          status = 'neutral';
        }
        
        // Extract domain - search in a wider area around the match
        const matchStart = Math.max(0, searchStr.indexOf(match[0]) - 100);
        const matchEnd = Math.min(searchStr.length, matchStart + 300);
        const context = searchStr.substring(matchStart, matchEnd);
        
        const domainPatterns = [
          /header\.from\s*=\s*([^\s;,)]+)/i,
          /policy\.d\s*=\s*([^\s;,)]+)/i,
          /\(([^)]+)\)/i, // Parentheses format
        ];
        
        let domain: string | undefined;
        for (const domainPattern of domainPatterns) {
          const domainMatch = context.match(domainPattern);
          if (domainMatch) {
            domain = domainMatch[1];
            break;
          }
        }
        
        // Extract policy
        const policyPatterns = [
          /policy\.p\s*=\s*([^\s;,)]+)/i,
          /policy\.policy\s*=\s*([^\s;,)]+)/i,
        ];
        
        let policy: string | undefined;
        for (const policyPattern of policyPatterns) {
          const policyMatch = context.match(policyPattern);
          if (policyMatch) {
            policy = policyMatch[1];
            break;
          }
        }
        
        const normalizedStatus = normalizeStatus(status);
        if (normalizedStatus !== 'none') {
          return {
            status: normalizedStatus,
            policy: policy || undefined,
            domain: domain || undefined,
          };
        }
      }
    }
  }
  
  // Check spam-related headers for DMARC info (e.g., X-SmarterMail-Spam: DMARC [passed])
  const spamHeaders = ['X-SmarterMail-Spam', 'X-Spam-Status', 'X-Spam-Checker-Version'];
  for (const headerName of spamHeaders) {
    const spamHeader = headers[headerName] || headers[headerName.toLowerCase()];
    if (spamHeader) {
      const spamStr = Array.isArray(spamHeader) ? spamHeader.join(' ') : String(spamHeader);
      const dmarcMatch = spamStr.match(/DMARC\s*\[(passed|failed|neutral|none)\]/i);
      if (dmarcMatch) {
        let status = dmarcMatch[1].toLowerCase();
        if (status === 'passed') {
          status = 'pass';
        } else if (status === 'failed') {
          status = 'fail';
        }
        return {
          status: normalizeStatus(status),
        };
      }
    }
  }
  
  return { status: 'none' };
}

function extractARC(authString: string, headers: Record<string, string | string[]>): AuthResult | undefined {
  const arcMatch = authString.match(/arc=([^\s]+)/i);
  if (arcMatch) {
    return {
      status: normalizeStatus(arcMatch[1]),
    };
  }
  return undefined;
}

function normalizeStatus(status: string): AuthResult['status'] {
  const normalized = status.toLowerCase().trim();
  
  // Handle variations
  if (normalized.includes('pass')) {
    return 'pass';
  }
  if (normalized.includes('fail')) {
    return normalized.startsWith('soft') ? 'softfail' : 'fail';
  }
  if (normalized.includes('error') || normalized.includes('err')) {
    if (normalized.includes('temp') || normalized.includes('transient')) {
      return 'temperror';
    }
    if (normalized.includes('perm') || normalized.includes('permanent')) {
      return 'permerror';
    }
    return 'temperror'; // Default error to temperror
  }
  
  // Standard statuses
  if (['pass', 'fail', 'neutral', 'none', 'softfail', 'temperror', 'permerror'].includes(normalized)) {
    return normalized as AuthResult['status'];
  }
  
  return 'none';
}

function extractRouting(headers: Map<string, any>): ReceivedHeader[] {
  const received: ReceivedHeader[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'received') {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((rec: any) => {
        const recStr = typeof rec === 'string' ? rec : String(rec);
        const parsed = parseReceivedHeader(recStr);
        if (parsed) received.push(parsed);
      });
    }
  });
  // Reverse to show chronological order (oldest first)
  return received.reverse();
}

function extractRoutingFromHeaders(headers: Record<string, string | string[]>): ReceivedHeader[] {
  const received: ReceivedHeader[] = [];
  const receivedHeaders = headers['Received'] || headers['received'] || [];
  const values = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];
  
  values.forEach((rec: string) => {
    const parsed = parseReceivedHeader(rec);
    if (parsed) received.push(parsed);
  });
  
  // Reverse to show chronological order (oldest first)
  return received.reverse();
}

function parseReceivedHeader(header: string): ReceivedHeader | null {
  try {
    // Parse Received header format: from X by Y via Z with PROTO id ID; date
    const fromMatch = header.match(/from\s+([^\s]+(?:\s+\([^)]+\))?)/i);
    const byMatch = header.match(/by\s+([^\s]+(?:\s+\([^)]+\))?)/i);
    const viaMatch = header.match(/via\s+([^\s]+)/i);
    const withMatch = header.match(/with\s+([^\s]+)/i);
    const idMatch = header.match(/id\s+([^\s;]+)/i);
    const forMatch = header.match(/for\s+([^\s;]+)/i);
    
    // Extract timestamp (usually at the end)
    const dateMatch = header.match(/;\s*(.+)$/);
    const timestamp = dateMatch ? parseDate(dateMatch[1].trim()) : new Date();

    return {
      from: fromMatch ? fromMatch[1] : 'unknown',
      by: byMatch ? byMatch[1] : 'unknown',
      via: viaMatch ? viaMatch[1] : undefined,
      with: withMatch ? withMatch[1] : undefined,
      id: idMatch ? idMatch[1] : undefined,
      for: forMatch ? forMatch[1] : undefined,
      timestamp,
    };
  } catch {
    return null;
  }
}

function analyzeSecurity(headers: Map<string, any> | Record<string, string | string[]>): SecurityAnalysis {
  const suspiciousPatterns: string[] = [];
  let tlsEncrypted = false;
  let spamScore: number | undefined;

  // Check for TLS
  const receivedHeaders: string[] = [];
  if (headers instanceof Map) {
    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'received') {
        const values = Array.isArray(value) ? value : [value];
        values.forEach((rec: any) => {
          receivedHeaders.push(String(rec));
        });
      }
    });
  } else {
    const received = headers['Received'] || headers['received'];
    if (received) {
      const values = Array.isArray(received) ? received : [received];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values.forEach((rec: any) => {
        receivedHeaders.push(String(rec));
      });
    }
  }
  
  receivedHeaders.forEach((rec: string) => {
    if (/with\s+(ESMTPS?|TLS)/i.test(rec)) {
      tlsEncrypted = true;
    }
  });

  // Check for spam score
  const spamHeaders = ['X-Spam-Score', 'X-Spam-Level', 'X-Rspamd-Score'];
  spamHeaders.forEach(header => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any;
    if (headers instanceof Map) {
      value = headers.get(header) || headers.get(header.toLowerCase());
    } else {
      value = headers[header] || headers[header.toLowerCase()];
    }
    if (value) {
      const score = parseFloat(Array.isArray(value) ? value[0] : String(value));
      if (!isNaN(score)) {
        spamScore = score;
      }
    }
  });

  return {
    spamScore,
    suspiciousPatterns,
    tlsEncrypted,
    blacklistStatus: 'unknown',
  };
}

function parseDate(dateStr: string): Date | null {
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

function extractRawHeaders(raw: string): string {
  const lines = raw.split('\n');
  const headerLines: string[] = [];
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('---')) {
      break;
    }
    headerLines.push(line);
  }
  return headerLines.join('\n');
}

