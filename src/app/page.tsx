'use client';

import { useState } from 'react';
import { EmailInput } from '@/components/EmailInput';
import { AnalysisView } from '@/components/AnalysisView';
import { parseEmailFile, parseEmailText } from '@/lib/email-parser';
import { EmailAnalysis } from '@/types/email';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { trackEvent } from '@/components/GoogleAnalytics';
import { Header } from '@/components/Header';

export default function Home() {
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    trackEvent('email_analysis', 'file_upload', 'started');
    try {
      const result = await parseEmailFile(file);
      setAnalysis(result);
      trackEvent('email_analysis', 'file_upload', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse email file';
      setError(errorMsg);
      setAnalysis(null);
      trackEvent('email_analysis', 'file_upload', 'error', 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    trackEvent('email_analysis', 'header_paste', 'started');
    try {
      const result = await parseEmailText(text);
      setAnalysis(result);
      trackEvent('email_analysis', 'header_paste', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse email headers';
      setError(errorMsg);
      setAnalysis(null);
      trackEvent('email_analysis', 'header_paste', 'error', 1);
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
            Email Header Analyzer
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Parse and analyze email headers to check authentication, routing, and security information
          </p>
        </div>

        <div className="space-y-6">
          <EmailInput
            onFileUpload={handleFileUpload}
            onTextSubmit={handleTextSubmit}
            isProcessing={isProcessing}
          />

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

          {analysis && <AnalysisView analysis={analysis} />}
        </div>
      </div>
    </div>
  );
}
