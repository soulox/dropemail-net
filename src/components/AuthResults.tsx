'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmailAnalysis } from '@/types/email';
import { Shield, HelpCircle } from 'lucide-react';
import { CopyButton } from '@/hooks/useCopyToClipboard';

interface AuthResultsProps {
  analysis: EmailAnalysis;
}

export function AuthResults({ analysis }: AuthResultsProps) {
  const { authentication } = analysis;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pass':
        return 'success';
      case 'fail':
      case 'permerror':
        return 'destructive';
      case 'softfail':
      case 'temperror':
        return 'warning';
      case 'neutral':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'SPF':
        return 'from-blue-500 to-cyan-500';
      case 'DKIM':
        return 'from-purple-500 to-pink-500';
      case 'DMARC':
        return 'from-orange-500 to-red-500';
      case 'ARC':
        return 'from-indigo-500 to-violet-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const AuthItem = ({
    label,
    result,
    tooltip,
  }: {
    label: string;
    result: typeof authentication.spf;
    tooltip?: string;
  }) => {
    const statusVariant = getStatusVariant(result.status);
    const isPass = result.status === 'pass';
    
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
        isPass
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800'
          : statusVariant === 'destructive'
          ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800'
          : statusVariant === 'warning'
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800'
          : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/30 dark:to-slate-900/30 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getLabelColor(label)}`}></div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{label}</span>
          {tooltip && (
            <HelpCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" title={tooltip} />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {result.domain && (
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded flex items-center gap-1">
              {result.domain}
              <CopyButton value={result.domain} size="sm" />
            </span>
          )}
          {result.selector && (
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded flex items-center gap-1">
              s={result.selector}
              <CopyButton value={result.selector} size="sm" />
            </span>
          )}
          {result.policy && (
            <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded border border-blue-300 dark:border-blue-700 flex items-center gap-1">
              p={result.policy}
              <CopyButton value={result.policy} size="sm" />
            </span>
          )}
          <Badge variant={getStatusVariant(result.status)} className="font-bold">
            {result.status === 'none' ? 'NOT FOUND' : result.status.toUpperCase()}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg -m-[1px] -mt-[1px]">
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          Authentication Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <AuthItem
            label="SPF"
            result={authentication.spf}
            tooltip="Sender Policy Framework - Verifies sender IP against domain's SPF record"
          />
          <AuthItem
            label="DKIM"
            result={authentication.dkim}
            tooltip="DomainKeys Identified Mail - Verifies email signature using cryptographic keys"
          />
          <AuthItem
            label="DMARC"
            result={authentication.dmarc}
            tooltip="Domain-based Message Authentication - Policy enforcement for SPF/DKIM results. Shows the result from the receiving server's Authentication-Results header. If 'NOT FOUND', the header doesn't contain DMARC verification results."
          />
          {authentication.arc && (
            <AuthItem
              label="ARC"
              result={authentication.arc}
              tooltip="Authenticated Received Chain - Preserves authentication state through forwarding"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

