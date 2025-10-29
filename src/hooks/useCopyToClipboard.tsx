'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export function useCopyToClipboard(showToastNotification = true) {
  const [copied, setCopied] = useState(false);
  // Always call the hook (React rules), but only use it if needed
  const toastContext = useToast();

  const copy = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      if (showToastNotification && toastContext) {
        const displayText = label || text.length > 50 ? (label || `${text.substring(0, 50)}...`) : text;
        toastContext.showToast(`Copied: ${displayText}`, 'success');
      }
      
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      if (showToastNotification && toastContext) {
        toastContext.showToast('Failed to copy to clipboard', 'error');
      }
      return false;
    }
  };

  return { copy, copied };
}

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function CopyButton({ value, label, size = 'sm' }: CopyButtonProps) {
  const { copy, copied } = useCopyToClipboard(true);

  return (
    <button
      onClick={() => copy(value, label || value)}
      className={`inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${copied ? 'text-green-600 dark:text-green-400' : ''}`}
      title={label || 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} animate-in`} />
          <span className="font-semibold">Copied!</span>
        </>
      ) : (
        <>
          <Copy className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
          <span>{label || 'Copy'}</span>
        </>
      )}
    </button>
  );
}

