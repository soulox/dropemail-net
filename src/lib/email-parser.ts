import { EmailAnalysis } from '@/types/email';

export async function parseEmailFile(file: File): Promise<EmailAnalysis> {
  const text = await file.text();
  return parseEmailText(text);
}

export async function parseEmailText(text: string): Promise<EmailAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emailText: text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse email');
  }

  return response.json();
}
