'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { EmailAnalysis } from '@/types/email';
import { Mail, Calendar, Hash, Shield } from 'lucide-react';
import { CopyButton } from '@/hooks/useCopyToClipboard';

interface SummaryCardProps {
  analysis: EmailAnalysis;
}

export function SummaryCard({ analysis }: SummaryCardProps) {
  const { summary } = analysis;

  const getSecurityScore = () => {
    const { authentication } = analysis;
    let score = 0;
    if (authentication.spf.status === 'pass') score++;
    if (authentication.dkim.status === 'pass') score++;
    if (authentication.dmarc.status === 'pass') score++;
    if (analysis.security.tlsEncrypted) score++;
    
    return { score, max: 4 };
  };

  const securityScore = getSecurityScore();

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg -m-[1px] -mt-[1px]">
        <CardTitle className="flex items-center gap-2 text-white">
          <Mail className="h-5 w-5" />
          Email Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/60 dark:bg-gray-900/60 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
          <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Subject</h3>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{summary.subject}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                From
              </h3>
              <CopyButton value={summary.from.address} size="sm" />
            </div>
            <p className="break-all">
              {summary.from.name && (
                <span className="text-gray-600 dark:text-gray-300">{summary.from.name} </span>
              )}
              <span className="font-mono text-gray-900 dark:text-gray-100">{summary.from.address}</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                To
              </h3>
              {summary.to.length > 0 && (
                <CopyButton value={summary.to.map(a => a.address).join(', ')} size="sm" />
              )}
            </div>
            <div className="space-y-1">
              {summary.to.map((addr, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <p className="break-all flex-1">
                    {addr.name && (
                      <span className="text-gray-600 dark:text-gray-300">{addr.name} </span>
                    )}
                    <span className="font-mono text-gray-900 dark:text-gray-100">{addr.address}</span>
                  </p>
                  <CopyButton value={addr.address} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {summary.cc && summary.cc.length > 0 && (
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20 p-3 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <h3 className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              CC
            </h3>
            <div className="space-y-1">
              {summary.cc.map((addr, idx) => (
                <p key={idx} className="break-all font-mono text-sm">
                  {addr.name && (
                    <span className="text-gray-600 dark:text-gray-300">{addr.name} </span>
                  )}
                  <span className="text-gray-900 dark:text-gray-100">{addr.address}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Date</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(summary.date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <Hash className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Message-ID</h3>
                {summary.messageId && <CopyButton value={summary.messageId} size="sm" />}
              </div>
              <p className="text-sm font-mono break-all text-gray-700 dark:text-gray-300">{summary.messageId || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 dark:from-red-950/20 dark:via-yellow-950/20 dark:to-green-950/20 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${
                  securityScore.score === securityScore.max
                    ? 'text-green-500'
                    : securityScore.score >= securityScore.max / 2
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`} />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Score</h3>
              </div>
              <Badge
                variant={
                  securityScore.score === securityScore.max
                    ? 'success'
                    : securityScore.score >= securityScore.max / 2
                    ? 'warning'
                    : 'destructive'
                }
                className="text-base px-3 py-1"
              >
                {securityScore.score} / {securityScore.max}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  securityScore.score === securityScore.max
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : securityScore.score >= securityScore.max / 2
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-red-500 to-pink-500'
                }`}
                style={{ width: `${(securityScore.score / securityScore.max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

