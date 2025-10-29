'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailAnalysis } from '@/types/email';
import { ChevronDown, ChevronUp, Code, FileText, Paperclip, Info, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { CopyButton } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/components/ui/toast';
import { formatBytes } from '@/lib/utils';

interface TechnicalDetailsProps {
  analysis: EmailAnalysis;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-left">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="border-t bg-muted/20">
          {children}
        </div>
      )}
    </div>
  );
}

export function TechnicalDetails({ analysis }: TechnicalDetailsProps) {
  const toast = useToast();

  // Extract IPs from routing
  const ipAddresses = analysis.routing.flatMap(hop => {
    const ips: string[] = [];
    // Try to extract IPs from "from" and "by" fields
    const ipPattern = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
    const fromMatch = hop.from.match(ipPattern);
    const byMatch = hop.by.match(ipPattern);
    if (fromMatch) ips.push(...fromMatch);
    if (byMatch) ips.push(...byMatch);
    return [...new Set(ips)]; // Remove duplicates
  });

  // Extract domains
  const domains: string[] = [];
  if (analysis.authentication.spf.domain) domains.push(analysis.authentication.spf.domain);
  if (analysis.authentication.dkim.domain) domains.push(analysis.authentication.dkim.domain);
  if (analysis.authentication.dmarc.domain) domains.push(analysis.authentication.dmarc.domain);
  // Extract from email addresses
  domains.push(analysis.summary.from.address.split('@')[1]);
  analysis.summary.to.forEach(addr => {
    const domain = addr.address.split('@')[1];
    if (domain) domains.push(domain);
  });
  const uniqueDomains = [...new Set(domains)];

  return (
    <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-t-lg -m-[1px] -mt-[1px]">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Code className="h-5 w-5" />
            Technical Details
          </CardTitle>
          <CopyButton value={analysis.rawHeaders} label="Copy Headers" size="md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {/* Raw Headers */}
        <CollapsibleSection title="Raw Headers" icon={<Code className="h-4 w-4" />} defaultOpen={false}>
          <div className="p-4">
            <div className="relative">
              <SyntaxHighlighter
                language="text"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  backgroundColor: '#1e1e1e',
                }}
                wrapLines={true}
                wrapLongLines={true}
                PreTag="div"
              >
                {analysis.rawHeaders}
              </SyntaxHighlighter>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(analysis.rawHeaders);
                    toast.showToast('Copied all headers to clipboard', 'success');
                  } catch {
                    toast.showToast('Failed to copy headers', 'error');
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Parsed Headers */}
        <CollapsibleSection title="Parsed Headers" icon={<FileText className="h-4 w-4" />} defaultOpen={false}>
          <div className="p-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(analysis.headers).map(([key, value]) => {
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                return (
                  <div
                    key={key}
                    className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-sm text-blue-600 dark:text-blue-400">
                          {key}
                        </span>
                        <CopyButton value={displayValue} size="sm" />
                      </div>
                      <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all pl-4">
                        {displayValue}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleSection>

        {/* MIME Structure */}
        <CollapsibleSection title="MIME Structure" icon={<Info className="h-4 w-4" />} defaultOpen={false}>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Content-Type: </span>
              <span className="font-mono text-sm">
                {analysis.headers['Content-Type'] || 'text/plain'}
              </span>
              {analysis.headers['Content-Type'] && (
                <CopyButton value={String(analysis.headers['Content-Type'])} size="sm" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">MIME-Version: </span>
              <span className="font-mono text-sm">
                {analysis.headers['MIME-Version'] || '1.0'}
              </span>
            </div>
            {analysis.attachments && analysis.attachments.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Has Attachments: </span>
                <span className="text-sm">Yes ({analysis.attachments.length})</span>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Attachments */}
        {analysis.attachments && analysis.attachments.length > 0 && (
          <CollapsibleSection title="Attachments" icon={<Paperclip className="h-4 w-4" />} defaultOpen={false}>
            <div className="p-4 space-y-2">
              {analysis.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white/50 dark:bg-gray-900/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{att.filename}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {att.contentType} • {formatBytes(att.size)}
                    </div>
                    {att.contentId && (
                      <div className="font-mono text-xs text-muted-foreground mt-1">
                        ID: {att.contentId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Quick Copy Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg border bg-white/50 dark:bg-gray-900/50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Copy className="h-4 w-4" />
              IP Addresses
            </h4>
            <div className="space-y-1">
              {ipAddresses.length > 0 ? (
                ipAddresses.map((ip, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-sm">
                    <span>{ip}</span>
                    <CopyButton value={ip} size="sm" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No IP addresses found</p>
              )}
              {ipAddresses.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(ipAddresses.join('\n'));
                      toast.showToast(`Copied ${ipAddresses.length} IP addresses`, 'success');
                    } catch {
                      toast.showToast('Failed to copy IP addresses', 'error');
                    }
                  }}
                >
                  Copy All IPs
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-white/50 dark:bg-gray-900/50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Domains
            </h4>
            <div className="space-y-1">
              {uniqueDomains.length > 0 ? (
                uniqueDomains.map((domain, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono text-sm">
                    <span>{domain}</span>
                    <CopyButton value={domain} size="sm" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No domains found</p>
              )}
              {uniqueDomains.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(uniqueDomains.join('\n'));
                      toast.showToast(`Copied ${uniqueDomains.length} domains`, 'success');
                    } catch {
                      toast.showToast('Failed to copy domains', 'error');
                    }
                  }}
                >
                  Copy All Domains
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

