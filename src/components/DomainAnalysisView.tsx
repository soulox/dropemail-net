'use client';

import { DomainAnalysis } from '@/types/domain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Info, Shield, Lock, Mail } from 'lucide-react';

interface DomainAnalysisViewProps {
  analysis: DomainAnalysis;
}

export function DomainAnalysisView({ analysis }: DomainAnalysisViewProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Domain Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{analysis.domain}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzed at {new Date(analysis.meta.queryTimestamp).toLocaleString()}
              </p>
            </div>
            <Badge variant={analysis.reputation.level === 'good' ? 'default' : analysis.reputation.level === 'fair' ? 'secondary' : 'destructive'}>
              {analysis.reputation.level.toUpperCase()} ({analysis.reputation.score}/100)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {analysis.reputation.notes.length > 0 && (
            <div className="space-y-1">
              {analysis.reputation.notes.map((note, i) => (
                <p key={i} className="text-sm text-muted-foreground">• {note}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MX Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            MX Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.mx.found ? (
            <div className="space-y-4">
              {analysis.mx.records.map((mx, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{mx.exchange}</p>
                      <p className="text-sm text-muted-foreground">Priority: {mx.priority}</p>
                    </div>
                    {mx.addresses && mx.addresses.length > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-mono">{mx.addresses[0]}</p>
                        {mx.geo && mx.geo[0] && (
                          <p className="text-xs text-muted-foreground">
                            {mx.geo[0].city && `${mx.geo[0].city}, `}
                            {mx.geo[0].countryCode || mx.geo[0].country}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No MX records found</p>
          )}
          {analysis.mx.issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {analysis.mx.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {getSeverityIcon(issue.severity)}
                  <div>
                    <p className="font-medium">{issue.summary}</p>
                    {issue.detail && <p className="text-muted-foreground">{issue.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SPF, DMARC, DKIM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SPF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              SPF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {analysis.spf.found ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">{analysis.spf.found ? 'Found' : 'Not Found'}</span>
            </div>
            {analysis.spf.record && (
              <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                {analysis.spf.record}
              </div>
            )}
            {analysis.spf.issues.length > 0 && (
              <div className="space-y-1">
                {analysis.spf.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {getSeverityIcon(issue.severity)}
                    <div>
                      <p>{issue.summary}</p>
                      {issue.detail && <p className="text-muted-foreground">{issue.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DMARC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              DMARC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {analysis.dmarc.found ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">{analysis.dmarc.found ? 'Found' : 'Not Found'}</span>
            </div>
            {analysis.dmarc.policy && (
              <Badge variant={analysis.dmarc.policy === 'reject' ? 'default' : analysis.dmarc.policy === 'quarantine' ? 'secondary' : 'outline'}>
                Policy: {analysis.dmarc.policy}
              </Badge>
            )}
            {analysis.dmarc.record && (
              <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                {analysis.dmarc.record}
              </div>
            )}
            {analysis.dmarc.issues.length > 0 && (
              <div className="space-y-1">
                {analysis.dmarc.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {getSeverityIcon(issue.severity)}
                    <div>
                      <p>{issue.summary}</p>
                      {issue.detail && <p className="text-muted-foreground">{issue.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DKIM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              DKIM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.dkim.checked ? (
              <>
                <div className="flex items-center gap-2">
                  {analysis.dkim.found ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">{analysis.dkim.found ? 'Found' : 'Not Found'}</span>
                </div>
                {analysis.dkim.selector && (
                  <p className="text-sm">Selector: <span className="font-mono">{analysis.dkim.selector}</span></p>
                )}
                {analysis.dkim.keyType && (
                  <Badge variant="outline">Key Type: {analysis.dkim.keyType}</Badge>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No selector provided</p>
            )}
            {analysis.dkim.issues.length > 0 && (
              <div className="space-y-1">
                {analysis.dkim.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {getSeverityIcon(issue.severity)}
                    <div>
                      <p>{issue.summary}</p>
                      {issue.detail && <p className="text-muted-foreground">{issue.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* STARTTLS */}
      {analysis.starttls.checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              STARTTLS Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.starttls.checks.map((check, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{check.host}</p>
                      {check.ip && <p className="text-sm text-muted-foreground font-mono">{check.ip}</p>}
                    </div>
                    <div className="flex gap-2">
                      {check.tlsEstablished && (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          TLS OK
                        </Badge>
                      )}
                      {check.score !== undefined && (
                        <Badge variant="outline">Score: {check.score}/100</Badge>
                      )}
                    </div>
                  </div>
                  {check.tlsProtocol && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Protocol: </span>
                        <span className="font-mono">{check.tlsProtocol}</span>
                      </div>
                      {check.cipher && (
                        <div>
                          <span className="text-muted-foreground">Cipher: </span>
                          <span className="font-mono">{check.cipher}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blacklists */}
      {(analysis.blacklists.domain.length > 0 || Object.keys(analysis.blacklists.ips).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Blacklist Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.blacklists.domain.length > 0 && (
              <div className="mb-4">
                <p className="font-medium mb-2">Domain Blacklists</p>
                <div className="space-y-1">
                  {analysis.blacklists.domain.map((listing, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{listing.list}</span>
                      <Badge variant={listing.listed ? 'destructive' : 'default'}>
                        {listing.listed ? (listing.responseCode ? `Listed (${listing.responseCode})` : 'Listed') : 'Clean'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(analysis.blacklists.ips).length > 0 && (
              <div>
                <p className="font-medium mb-2">IP Blacklists</p>
                {Object.entries(analysis.blacklists.ips).map(([ip, listings]) => (
                  <div key={ip} className="mb-3">
                    <p className="text-sm font-mono mb-1">{ip}</p>
                    <div className="space-y-1 ml-4">
                      {listings.map((listing, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{listing.list}</span>
                          <Badge variant={listing.listed ? 'destructive' : 'default'}>
                            {listing.listed ? (listing.responseCode ? `Listed (${listing.responseCode})` : 'Listed') : 'Clean'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

