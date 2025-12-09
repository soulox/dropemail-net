'use client';

import { useState } from 'react';
import { EmailInput } from '@/components/EmailInput';
import { DomainInput } from '@/components/DomainInput';
import { AnalysisView } from '@/components/AnalysisView';
import { DomainAnalysisView } from '@/components/DomainAnalysisView';
import { parseEmailFile, parseEmailText } from '@/lib/email-parser';
import { EmailAnalysis } from '@/types/email';
import { DomainAnalysis } from '@/types/domain';
import { AlertCircle, Mail, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/components/GoogleAnalytics';
import { Header } from '@/components/Header';

type AnalysisMode = 'email' | 'domain';

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>('email');
  const [emailAnalysis, setEmailAnalysis] = useState<EmailAnalysis | null>(null);
  const [domainAnalysis, setDomainAnalysis] = useState<DomainAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setMode('email');
    trackEvent('email_analysis', 'file_upload', 'started');
    try {
      const result = await parseEmailFile(file);
      setEmailAnalysis(result);
      setDomainAnalysis(null);
      trackEvent('email_analysis', 'file_upload', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse email file';
      setError(errorMsg);
      setEmailAnalysis(null);
      trackEvent('email_analysis', 'file_upload', 'error', 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    setMode('email');
    trackEvent('email_analysis', 'header_paste', 'started');
    try {
      const result = await parseEmailText(text);
      setEmailAnalysis(result);
      setDomainAnalysis(null);
      trackEvent('email_analysis', 'header_paste', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse email headers';
      setError(errorMsg);
      setEmailAnalysis(null);
      trackEvent('email_analysis', 'header_paste', 'error', 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDomainSubmit = async (domain: string, options?: { dkimSelector?: string; quickTest?: boolean }) => {
    setIsProcessing(true);
    setError(null);
    setMode('domain');
    trackEvent('domain_analysis', 'domain_submit', 'started');
    try {
      const response = await fetch('/api/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain,
          dkimSelector: options?.dkimSelector,
          quickTest: options?.quickTest,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to analyze domain');
      }

      const result = await response.json() as DomainAnalysis;
      setDomainAnalysis(result);
      setEmailAnalysis(null);
      trackEvent('domain_analysis', 'domain_submit', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze domain';
      setError(errorMsg);
      setDomainAnalysis(null);
      trackEvent('domain_analysis', 'domain_submit', 'error', 1);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Email Security Analyzer
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Analyze email headers or domain security configuration
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            variant={mode === 'email' ? 'default' : 'outline'}
            onClick={() => {
              setMode('email');
              setError(null);
              setEmailAnalysis(null);
              setDomainAnalysis(null);
            }}
            disabled={isProcessing}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email Headers
          </Button>
          <Button
            variant={mode === 'domain' ? 'default' : 'outline'}
            onClick={() => {
              setMode('domain');
              setError(null);
              setEmailAnalysis(null);
              setDomainAnalysis(null);
            }}
            disabled={isProcessing}
          >
            <Globe className="mr-2 h-4 w-4" />
            Domain Analysis
          </Button>
        </div>

        <div className="space-y-6">
          {mode === 'email' ? (
            <EmailInput
              onFileUpload={handleFileUpload}
              onTextSubmit={handleTextSubmit}
              isProcessing={isProcessing}
            />
          ) : (
            <DomainInput
              onDomainSubmit={handleDomainSubmit}
              isProcessing={isProcessing}
            />
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {emailAnalysis && <AnalysisView analysis={emailAnalysis} />}
          {domainAnalysis && <DomainAnalysisView analysis={domainAnalysis} />}
        </div>
      </div>
    </div>
  );
}
