'use client';

import { EmailAnalysis } from '@/types/email';
import { SummaryCard } from './SummaryCard';
import { AuthResults } from './AuthResults';
import { RoutingChain } from './RoutingChain';
import { TechnicalDetails } from './TechnicalDetails';

interface AnalysisViewProps {
  analysis: EmailAnalysis;
}

export function AnalysisView({ analysis }: AnalysisViewProps) {
  return (
    <div className="space-y-6">
      <SummaryCard analysis={analysis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AuthResults analysis={analysis} />
        <RoutingChain analysis={analysis} />
      </div>
      <TechnicalDetails analysis={analysis} />
    </div>
  );
}

