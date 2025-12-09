'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DomainInputProps {
  onDomainSubmit: (domain: string, options?: {
    dkimSelector?: string;
    quickTest?: boolean;
  }) => void;
  isProcessing?: boolean;
}

export function DomainInput({ onDomainSubmit, isProcessing }: DomainInputProps) {
  const [domain, setDomain] = useState('');
  const [dkimSelector, setDkimSelector] = useState('');
  const [quickTest, setQuickTest] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      onDomainSubmit(domain.trim(), {
        dkimSelector: dkimSelector.trim() || undefined,
        quickTest,
      });
    }
  };

  const handleClear = () => {
    setDomain('');
    setDkimSelector('');
    setQuickTest(false);
  };

  const isValidDomain = (d: string) => {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d.trim());
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-2">
              Domain Name
            </label>
            <div className="flex gap-2">
              <input
                id="domain"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className={cn(
                  "flex-1 px-4 py-2 border rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  "dark:bg-gray-800 dark:border-gray-700"
                )}
                disabled={isProcessing}
                pattern="[a-z0-9.-]+\.[a-z]{2,}"
              />
              <Button
                type="submit"
                disabled={!isValidDomain(domain) || isProcessing}
              >
                <Search className="mr-2 h-4 w-4" />
                Analyze
              </Button>
              {domain && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter a domain name to analyze its email security configuration
            </p>
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label htmlFor="dkim-selector" className="block text-sm font-medium mb-2">
                  DKIM Selector (optional)
                </label>
                <input
                  id="dkim-selector"
                  type="text"
                  value={dkimSelector}
                  onChange={(e) => setDkimSelector(e.target.value)}
                  placeholder="default, selector1, etc."
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    "dark:bg-gray-800 dark:border-gray-700"
                  )}
                  disabled={isProcessing}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="quick-test"
                  type="checkbox"
                  checked={quickTest}
                  onChange={(e) => setQuickTest(e.target.checked)}
                  disabled={isProcessing}
                  className="h-4 w-4"
                />
                <label htmlFor="quick-test" className="text-sm">
                  Quick test (check only first MX record)
                </label>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

