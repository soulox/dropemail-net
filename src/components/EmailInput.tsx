'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmailInputProps {
  onFileUpload: (file: File) => void;
  onTextSubmit: (text: string) => void;
  isProcessing?: boolean;
}

export function EmailInput({ onFileUpload, onTextSubmit, isProcessing }: EmailInputProps) {
  const [dragActive, setDragActive] = useState(false);
  const [headerText, setHeaderText] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.eml') || file.type === 'message/rfc822') {
        onFileUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed:', e.target.files);
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      onFileUpload(e.target.files[0]);
    }
  };

  const handleTextSubmit = () => {
    if (headerText.trim()) {
      onTextSubmit(headerText);
    }
  };

  const handleClear = () => {
    setHeaderText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex gap-2 mb-4 border-b pb-4">
          <Button
            variant={inputMode === 'file' ? 'default' : 'ghost'}
            onClick={() => setInputMode('file')}
            size="sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
          <Button
            variant={inputMode === 'text' ? 'default' : 'ghost'}
            onClick={() => setInputMode('text')}
            size="sm"
          >
            <FileText className="mr-2 h-4 w-4" />
            Paste Headers
          </Button>
        </div>

        {inputMode === 'file' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            )}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your .eml file here
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,message/rfc822"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isProcessing}
                aria-label="Upload email file"
              />
              <Button
                variant="outline"
                disabled={isProcessing}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Browse button clicked, file input ref:', fileInputRef.current);
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  } else {
                    console.error('File input ref is null');
                  }
                }}
              >
                Browse Files
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Supports .eml files and raw email headers
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Paste your email headers here..."
              className="min-h-[300px] font-mono text-sm"
              disabled={isProcessing}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleTextSubmit}
                disabled={!headerText.trim() || isProcessing}
              >
                Analyze Headers
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={!headerText.trim() || isProcessing}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

