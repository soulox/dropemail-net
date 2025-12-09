'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DomainAnalysis } from '@/types/domain';

interface DomainInputProps {
	onAnalyze: (result: DomainAnalysis) => void;
}

export function DomainInput({ onAnalyze }: DomainInputProps) {
	const [domain, setDomain] = useState('');
	const [selector, setSelector] = useState('');
	const [headerFrom, setHeaderFrom] = useState('');
	const [envelopeFrom, setEnvelopeFrom] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [quickTest, setQuickTest] = useState(false);
	const [compelTls, setCompelTls] = useState(false);
	const [directTls, setDirectTls] = useState(false);

	const handleAnalyze = async () => {
		if (!domain.trim()) return;
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/domain', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					domain: domain.trim(),
					dkimSelector: selector.trim() || undefined,
					headerFrom: headerFrom.trim() || undefined,
					envelopeFrom: envelopeFrom.trim() || undefined,
					quickTest,
					compelTls,
					directTls,
					ports: [25, 465, 587],
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || `Request failed with ${res.status}`);
			}
			const data = (await res.json()) as DomainAnalysis;
			onAnalyze(data);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to analyze domain');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="w-full">
			<CardContent className="p-6 space-y-4">
				<div className="flex flex-wrap gap-2 text-xs">
					<span className="text-muted-foreground">Examples:</span>
					{['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'].map((d) => (
						<button
							key={d}
							type="button"
							onClick={() => {
								setDomain(d);
								setHeaderFrom(`user@${d}`);
								setEnvelopeFrom(`bounce@${d}`);
							}}
							className="px-2 py-1 border rounded hover:bg-muted"
							disabled={isLoading}
						>
							{d}
						</button>
					))}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="md:col-span-2">
						<label className="block text-sm text-muted-foreground mb-1">Domain</label>
						<input
							value={domain}
							onChange={(e) => setDomain(e.target.value)}
							placeholder="example.com"
							className="w-full rounded-md border px-3 py-2 bg-background"
							disabled={isLoading}
						/>
					</div>
					<div>
						<label className="block text-sm text-muted-foreground mb-1">DKIM selector (optional)</label>
						<input
							value={selector}
							onChange={(e) => setSelector(e.target.value)}
							placeholder="selector1"
							className="w-full rounded-md border px-3 py-2 bg-background"
							disabled={isLoading}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="block text-sm text-muted-foreground mb-1">Header From (optional)</label>
						<input
							value={headerFrom}
							onChange={(e) => setHeaderFrom(e.target.value)}
							placeholder="user@example.com or example.com"
							className="w-full rounded-md border px-3 py-2 bg-background"
							disabled={isLoading}
						/>
					</div>
					<div>
						<label className="block text-sm text-muted-foreground mb-1">Envelope From (optional)</label>
						<input
							value={envelopeFrom}
							onChange={(e) => setEnvelopeFrom(e.target.value)}
							placeholder="bounce@example.com or example.com"
							className="w-full rounded-md border px-3 py-2 bg-background"
							disabled={isLoading}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={quickTest} onChange={(e) => setQuickTest(e.target.checked)} disabled={isLoading} />
						Quick Test
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={compelTls} onChange={(e) => setCompelTls(e.target.checked)} disabled={isLoading} />
						Compel TLS (send STARTTLS anyway)
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={directTls} onChange={(e) => setDirectTls(e.target.checked)} disabled={isLoading} />
						Direct TLS (465)
					</label>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={handleAnalyze} disabled={!domain.trim() || isLoading}>
						{isLoading ? 'Analyzing…' : 'Analyze Domain'}
					</Button>
					<Button variant="outline" onClick={handleAnalyze} disabled={!domain.trim() || isLoading}>
						Re-run
					</Button>
					{error && <span className="text-sm text-destructive">{error}</span>}
				</div>
			</CardContent>
		</Card>
	);
}


