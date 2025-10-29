'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmailAnalysis } from '@/types/email';
import { Network, ArrowRight, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface RoutingChainProps {
  analysis: EmailAnalysis;
}

export function RoutingChain({ analysis }: RoutingChainProps) {
  const { routing } = analysis;

  if (routing.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Routing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No routing information found</p>
        </CardContent>
      </Card>
    );
  }

  const getHopColor = (index: number) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-green-500 to-emerald-500',
      'from-indigo-500 to-violet-500',
      'from-teal-500 to-cyan-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-yellow-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg -m-[1px] -mt-[1px]">
        <CardTitle className="flex items-center gap-2 text-white">
          <Network className="h-5 w-5" />
          Routing Chain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {routing.map((hop, index) => {
            const hopColor = getHopColor(index);
            return (
            <div key={index} className="relative">
              {index < routing.length - 1 && (
                <div className={`absolute left-4 top-12 bottom-0 w-1 bg-gradient-to-b ${hopColor} opacity-30`} />
              )}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`rounded-full bg-gradient-to-r ${hopColor} text-white w-10 h-10 flex items-center justify-center text-xs font-bold z-10 shadow-lg border-2 border-white dark:border-gray-800`}>
                    {routing.length - index}
                  </div>
                </div>
                <div className="flex-1 pb-4">
                  <div className={`bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/80 dark:to-gray-800/80 rounded-lg p-4 space-y-2 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">From:</span>
                          <span className="text-sm font-mono break-all">{hop.from}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">By:</span>
                          <span className="text-sm font-mono break-all">{hop.by}</span>
                        </div>
                      </div>
                    </div>
                    
                    {hop.via && (
                      <div className="text-xs text-muted-foreground">
                        Via: {hop.via}
                      </div>
                    )}
                    
                    {hop.with && (
                      <div className="text-xs text-muted-foreground">
                        With: {hop.with}
                      </div>
                    )}
                    
                    {hop.for && (
                      <div className="text-xs text-muted-foreground font-mono">
                        For: {hop.for}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Clock className={`h-3 w-3 text-purple-500`} />
                      <span className="font-medium">{formatDate(hop.timestamp)}</span>
                      {hop.delay !== undefined && hop.delay > 0 && (
                        <>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-orange-600 dark:text-orange-400 font-semibold">Delay: {hop.delay.toFixed(2)}s</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 p-3 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Total Hops:</span>
            <Badge variant="outline" className="bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-bold">
              {routing.length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

