'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { DomainInput } from '@/components/DomainInput';
import { DomainAnalysisView } from '@/components/DomainAnalysisView';
import { DomainAnalysis } from '@/types/domain';

export default function DomainPage() {
	const [result, setResult] = useState<DomainAnalysis | null>(null);

	return (
		<div className="min-h-screen bg-background">
			<Header />
			<div className="container mx-auto px-4 py-8 max-w-5xl">
				<div className="mb-8 text-center">
					<h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
						Domain Deliverability Check
					</h1>
					<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
						Enter your domain to check MX records, SPF, DMARC and optionally DKIM.
					</p>
				</div>

				<div className="space-y-6">
					<DomainInput onAnalyze={setResult} />
					{result && <DomainAnalysisView result={result} />}
				</div>
			</div>
		</div>
	);
}



