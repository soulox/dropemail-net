export interface EmailAddress {
  name?: string;
  address: string;
}

export interface AuthResult {
  status: 'pass' | 'fail' | 'neutral' | 'none' | 'softfail' | 'temperror' | 'permerror';
  domain?: string;
  selector?: string;
  policy?: string;
  reason?: string;
}

export interface ReceivedHeader {
  from: string;
  by: string;
  via?: string;
  with?: string;
  id?: string;
  for?: string;
  timestamp: Date;
  delay?: number; // seconds between this hop and next
}

export interface SecurityAnalysis {
  spamScore?: number;
  suspiciousPatterns: string[];
  tlsEncrypted: boolean;
  blacklistStatus?: 'clean' | 'listed' | 'unknown';
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface EmailAnalysis {
  summary: {
    subject: string;
    from: EmailAddress;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    date: Date;
    messageId: string;
  };
  authentication: {
    spf: AuthResult;
    dkim: AuthResult;
    dmarc: AuthResult;
    arc?: AuthResult;
  };
  routing: ReceivedHeader[];
  security: SecurityAnalysis;
  headers: Record<string, string | string[]>;
  attachments?: Attachment[];
  rawHeaders: string;
}

export interface ParsedEmail {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any; // mailparser result
  raw: string;
}

