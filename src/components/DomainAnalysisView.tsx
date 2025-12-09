'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DomainAnalysis, DnsIssue } from '@/types/domain';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface DomainAnalysisViewProps {
	result: DomainAnalysis;
}

export function DomainAnalysisView({ result }: DomainAnalysisViewProps) {
	const [showError, setShowError] = useState(true);
	const [showWarning, setShowWarning] = useState(true);
	const [showInfo, setShowInfo] = useState(true);
	const copy = useCopyToClipboard();

	const severityFilter = useMemo(
		() => ({
			error: showError,
			warning: showWarning,
			info: showInfo,
		}),
		[showError, showWarning, showInfo],
	);

	return (
		<div className="space-y-6">
			{/* Filters */}
			<Card>
				<CardContent className="p-4 flex flex-wrap gap-2 items-center">
					<span className="text-sm text-muted-foreground">Filter issues:</span>
					<Button size="sm" variant={showError ? 'default' : 'outline'} onClick={() => setShowError((v) => !v)}>
						<Badge variant="destructive" className="mr-2">ERROR</Badge>
						{showError ? 'Shown' : 'Hidden'}
					</Button>
					<Button size="sm" variant={showWarning ? 'default' : 'outline'} onClick={() => setShowWarning((v) => !v)}>
						<Badge className="mr-2">WARN</Badge>
						{showWarning ? 'Shown' : 'Hidden'}
					</Button>
					<Button size="sm" variant={showInfo ? 'default' : 'outline'} onClick={() => setShowInfo((v) => !v)}>
						<Badge variant="secondary" className="mr-2">INFO</Badge>
						{showInfo ? 'Shown' : 'Hidden'}
					</Button>
				</CardContent>
			</Card>
			{/* Simulations */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">DMARC What‑if Simulations</h3>
					<div className="text-xs text-muted-foreground mb-2">
						Input — headerFrom: <span className="font-mono">{result.simulations.input.headerFrom}</span>,
						envelopeFrom: <span className="font-mono">{result.simulations.input.envelopeFrom}</span>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-xs border">
							<thead className="bg-muted">
								<tr>
									<th className="text-left p-2">Policy</th>
									<th className="text-left p-2">adkim</th>
									<th className="text-left p-2">aspf</th>
									<th className="text-left p-2">Pass</th>
									<th className="text-left p-2">By</th>
									<th className="text-left p-2">Disposition</th>
								</tr>
							</thead>
							<tbody>
								{result.simulations.scenarios.map((s, i) => (
									<tr key={i} className="border-t">
										<td className="p-2">{s.policy}</td>
										<td className="p-2">{s.adkim}</td>
										<td className="p-2">{s.aspf}</td>
										<td className="p-2">{String(s.alignedPass)}</td>
										<td className="p-2">{s.passBy}</td>
										<td className="p-2">{s.disposition}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
			{/* Reputation */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">Reputation</h3>
					<div className="text-sm">
						Score: <span className="font-mono">{result.reputation.score}</span> ({result.reputation.level})
					</div>
					{result.reputation.notes.length > 0 && (
						<ul className="mt-2 list-disc list-inside text-xs text-muted-foreground">
							{result.reputation.notes.map((n, i) => (
								<li key={i}>{n}</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			{/* SMTP STARTTLS */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">SMTP STARTTLS</h3>
					{typeof result.starttls.confidenceFactor === 'number' && (
						<div className="mb-3 text-sm">
							Confidence Factor: <span className="font-mono">{result.starttls.confidenceFactor}</span>
							{typeof result.starttls.maxScore === 'number' ? <> of <span className="font-mono">{result.starttls.maxScore}</span></> : null}
						</div>
					)}
					{result.starttls.checks.length === 0 ? (
						<p className="text-sm text-muted-foreground">No STARTTLS checks performed.</p>
					) : (
						<div className="space-y-3 text-sm">
							<div className="overflow-x-auto">
								<table className="w-full text-xs border">
									<thead className="bg-muted">
										<tr>
											<th className="p-2 text-left">MX Server</th>
											<th className="p-2 text-left">Pref</th>
											<th className="p-2 text-left">Answer</th>
											<th className="p-2 text-left">Connect</th>
											<th className="p-2 text-left">HELO</th>
											<th className="p-2 text-left">TLS</th>
											<th className="p-2 text-left">Cert</th>
											<th className="p-2 text-left">Secure</th>
											<th className="p-2 text-left">From</th>
											<th className="p-2 text-left">MTASTS</th>
											<th className="p-2 text-left">DANE</th>
											<th className="p-2 text-left">Score</th>
										</tr>
									</thead>
									<tbody>
										{result.starttls.checks.map((c, i) => (
											<tr key={i} className="border-t align-top">
												<td className="p-2">
													<div className="font-mono">{c.host}</div>
													{c.tlsEstablished && (
														<div className="text-[11px] text-muted-foreground">
															{c.tlsProtocol} • {c.cipher}
														</div>
													)}
												</td>
												<td className="p-2">{c.mxPref ?? '—'}</td>
												<td className="p-2">{c.answer ?? (c.ip ? `${c.ip}:25` : '—')}</td>
												<td className="p-2">{c.connectOk ? `OK${c.timings?.connectMs ? ` (${c.timings.connectMs}ms)` : ''}` : 'FAIL'}</td>
												<td className="p-2">{c.heloOk ? `OK${c.timings?.heloMs ? ` (${c.timings.heloMs}ms)` : ''}` : 'FAIL'}</td>
												<td className="p-2">{c.starttlsSupported ? 'OK' : 'FAIL'}</td>
												<td className="p-2">{c.certAuthorized ? 'OK' : (c.tlsEstablished ? 'FAIL' : '—')}</td>
												<td className="p-2">{c.secureOk ? 'OK' : (c.tlsEstablished ? 'FAIL' : '—')}</td>
												<td className="p-2">{c.mailFromOk ? `OK${c.timings?.mailFromMs ? ` (${c.timings.mailFromMs}ms)` : ''}` : (c.tlsEstablished ? 'FAIL' : '—')}</td>
												<td className="p-2">{c.mtastsOk ? 'OK' : 'not tested'}</td>
												<td className="p-2">{typeof c.daneOk === 'string' ? c.daneOk : (c.daneOk ? 'OK' : 'FAIL')}</td>
												<td className="p-2">{typeof c.score === 'number' ? c.score.toFixed(0) : '—'}</td>
											</tr>
										))}
										<tr className="border-t bg-muted/50">
											<td className="p-2 font-medium">Average</td>
											<td className="p-2" />
											<td className="p-2" />
											<td className="p-2">{Math.round(100 * (result.starttls.checks.filter(c => c.connectOk).length / result.starttls.checks.length))}%</td>
											<td className="p-2">{Math.round(100 * (result.starttls.checks.filter(c => c.heloOk).length / result.starttls.checks.length))}%</td>
											<td className="p-2">{Math.round(100 * (result.starttls.checks.filter(c => c.starttlsSupported).length / result.starttls.checks.length))}%</td>
											<td className="p-2">{Math.round(100 * (result.starttls.checks.filter(c => c.certAuthorized).length / result.starttls.checks.length))}%</td>
											<td className="p-2">{Math.round(100 * (result.starttls.checks.filter(c => c.secureOk).length / result.starttls.checks.length))}%</td>
											<td className="p-2">{Math.round(100 * (result.starttls.checks.filter(c => c.mailFromOk).length / result.starttls.checks.length))}%</td>
											<td className="p-2" />
											<td className="p-2" />
											<td className="p-2">
												{(() => {
													const scores = result.starttls.checks.map(c => c.score ?? 0);
													const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
													return Math.round(avg);
												})()}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
							<div className="space-y-2">
								{result.starttls.checks.map((c, i) => (
									<details key={`tx-${i}`} className="rounded border p-2 text-xs">
										<summary className="cursor-pointer">
											Transcript — {c.host}{c.answer ? ` [${c.answer}]` : ''}
										</summary>
										{(c.transcript && c.transcript.length) ? (
											<pre className="mt-2 whitespace-pre-wrap">{c.transcript.join('\n')}</pre>
										) : (
											<div className="mt-2 text-muted-foreground">No transcript captured.</div>
										)}
									</details>
								))}
							</div>
							{result.starttls.checks.map((c, i) => (
								<div key={`issues-${i}`} className="text-xs">
									<Issues issues={c.issues} filter={severityFilter} />
								</div>
							))}
						</div>
					)}
					<Issues issues={result.starttls.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* BIMI */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">BIMI</h3>
					{result.bimi.found && result.bimi.record ? (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Badge variant={result.bimi.validSvg ? 'default' : 'secondary'}>
									{result.bimi.validSvg ? 'pass' : 'warn'}
								</Badge>
								<Button size="sm" variant="outline" onClick={() => copy.copy(result.bimi.record || '')}>
									Copy record
								</Button>
							</div>
							<pre className="text-xs bg-muted border rounded p-3 overflow-x-auto">{result.bimi.record}</pre>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
								<div>Selector: <span className="font-mono">{result.bimi.selector}</span></div>
								<div>Logo URL: <span className="font-mono">{result.bimi.logoUrl ?? '—'}</span></div>
								<div>Authority: <span className="font-mono">{result.bimi.authority ?? '—'}</span></div>
								<div>SVG valid: <span className="font-mono">{String(result.bimi.validSvg ?? false)}</span></div>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No BIMI record found.</p>
					)}
					<Issues issues={result.bimi.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* MX */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">MX Records</h3>
					{result.mx.found ? (
						<div className="space-y-3">
							{result.mx.records.map((mx) => (
								<div key={`${mx.exchange}-${mx.priority}`} className="text-sm">
									<div>
										<span className="font-mono">{mx.exchange}</span> (priority {mx.priority})
									</div>
									{(mx.addresses?.length || 0) > 0 && (
										<div className="mt-1 pl-3 border-l text-xs space-y-1">
											{mx.addresses?.map((ip) => (
												<div key={ip}>
													<span className="font-mono">{ip}</span>
												</div>
											))}
											{mx.geo?.map((g) => (
												<div key={g.ip} className="text-muted-foreground">
													<span className="font-mono">{g.ip}</span>
													{' — '}
													{g.city ? `${g.city}, ` : ''}
													{g.region ? `${g.region}, ` : ''}
													{g.country || ''}
													{g.org ? ` • ${g.org}` : ''}
													{g.asn ? ` • ASN ${g.asn}` : ''}
												</div>
											))}
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No MX records found.</p>
					)}
					<Issues issues={result.mx.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* Blacklists */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">Blacklists</h3>
					<div className="space-y-3 text-sm">
						<div>
							<div className="font-medium">Domain</div>
					{result.blacklists.domain.length === 0 ? (
								<div className="text-muted-foreground text-xs">No checks performed.</div>
							) : (
								<ul className="text-xs pl-4 list-disc">
									{result.blacklists.domain.map((d, i) => (
										<li key={i}>
											{d.list}: {d.listed ? 'Listed' : 'Not listed'}
										</li>
									))}
								</ul>
							)}
						</div>
						<div>
							<div className="font-medium">MX IPs</div>
							{Object.keys(result.blacklists.ips).length === 0 ? (
								<div className="text-muted-foreground text-xs">No IP checks performed.</div>
							) : (
								<div className="space-y-2">
									{Object.entries(result.blacklists.ips).map(([ip, entries]) => (
										<div key={ip} className="text-xs">
											<div className="font-mono">{ip}</div>
											<ul className="pl-4 list-disc">
												{entries.map((e, i) => (
													<li key={i}>
														{e.list}: {e.listed ? 'Listed' : 'Not listed'}
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<Issues issues={result.blacklists.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* SPF */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">SPF</h3>
					{result.spf.found && result.spf.record ? (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Badge variant={result.spf.validSyntax ? 'default' : 'destructive'}>
									{result.spf.validSyntax ? 'pass' : 'fail'}
								</Badge>
								<Button size="sm" variant="outline" onClick={() => copy.copy(result.spf.record || '')}>
									Copy SPF
								</Button>
							</div>
							<pre className="text-xs bg-muted border rounded p-3 overflow-x-auto">{result.spf.record}</pre>
							<div className="text-sm text-muted-foreground">
								Syntax: {result.spf.validSyntax ? 'valid' : 'invalid'}
							</div>
							{result.spf.allMechanism && (
								<div className="text-sm">All mechanism: <span className="font-mono">{result.spf.allMechanism}</span></div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No SPF record found.</p>
					)}
					<Issues issues={result.spf.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* DMARC */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">DMARC</h3>
					{result.dmarc.found && result.dmarc.record ? (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Badge variant={result.dmarc.policy && result.dmarc.policy !== 'none' ? 'default' : 'secondary'}>
									{result.dmarc.policy ?? 'unknown'}
								</Badge>
								<Button size="sm" variant="outline" onClick={() => copy.copy(result.dmarc.record || '')}>
									Copy DMARC
								</Button>
							</div>
							<pre className="text-xs bg-muted border rounded p-3 overflow-x-auto">{result.dmarc.record}</pre>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
								<div>Policy: <span className="font-mono">{result.dmarc.policy ?? 'unknown'}</span></div>
								<div>Subdomain policy: <span className="font-mono">{result.dmarc.subdomainPolicy ?? 'inherit'}</span></div>
								<div>Pct: <span className="font-mono">{result.dmarc.pct ?? 100}</span></div>
								<div>Alignment (adkim/aspf): <span className="font-mono">{result.dmarc.alignment?.adkim ?? 'r'}/{result.dmarc.alignment?.aspf ?? 'r'}</span></div>
							</div>
							{(result.dmarc.rua?.length || 0) > 0 && (
								<div className="text-sm">
									RUA: <span className="font-mono">{result.dmarc.rua?.join(', ')}</span>
								</div>
							)}
							{(result.dmarc.ruf?.length || 0) > 0 && (
								<div className="text-sm">
									RUF: <span className="font-mono">{result.dmarc.ruf?.join(', ')}</span>
								</div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No DMARC record found.</p>
					)}
					<Issues issues={result.dmarc.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* MTA-STS */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">MTA-STS</h3>
					{(result.mtasts.foundTxt || result.mtasts.foundPolicy) ? (
						<div className="space-y-2 text-sm">
							<div>TXT present: <span className="font-mono">{String(result.mtasts.foundTxt)}</span></div>
							{result.mtasts.id && <div>TXT id: <span className="font-mono">{result.mtasts.id}</span></div>}
							<div>Policy present: <span className="font-mono">{String(result.mtasts.foundPolicy)}</span></div>
							{result.mtasts.policy && (
								<div className="space-y-1">
									<div>Mode: <span className="font-mono">{result.mtasts.policy.mode ?? '—'}</span></div>
									<div>Max-Age: <span className="font-mono">{result.mtasts.policy.maxAge ?? '—'}</span></div>
									{(result.mtasts.policy.mx?.length || 0) > 0 && (
										<div>MX hosts: <span className="font-mono">{result.mtasts.policy.mx?.join(', ')}</span></div>
									)}
								</div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No MTA-STS configuration detected.</p>
					)}
					<Issues issues={result.mtasts.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* TLS-RPT */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">TLS-RPT</h3>
					{result.tlsrpt.found && result.tlsrpt.record ? (
						<div className="space-y-2">
							<pre className="text-xs bg-muted rounded p-3 overflow-x-auto">{result.tlsrpt.record}</pre>
							{(result.tlsrpt.rua?.length || 0) > 0 && (
								<div className="text-sm">RUA: <span className="font-mono">{result.tlsrpt.rua?.join(', ')}</span></div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No TLS-RPT record found.</p>
					)}
					<Issues issues={result.tlsrpt.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* DKIM */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">DKIM</h3>
					{result.dkim.checked ? (
						result.dkim.found && result.dkim.record ? (
							<div className="space-y-2">
								<div className="text-sm">
									Selector: <span className="font-mono">{result.dkim.selector}</span>
								</div>
								<div className="flex items-center justify-between">
									<Badge variant="secondary">{result.dkim.keyType ?? 'unknown'}</Badge>
									<Button size="sm" variant="outline" onClick={() => copy.copy(result.dkim.record || '')}>
										Copy DKIM
									</Button>
								</div>
								<pre className="text-xs bg-muted border rounded p-3 overflow-x-auto">{result.dkim.record}</pre>
								<div className="text-sm">
									Key: <span className="font-mono">{result.dkim.keyType ?? 'unknown'}</span>
									{result.dkim.keyLengthBits ? ` (${result.dkim.keyLengthBits} bits est.)` : ''}
								</div>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No DKIM record found for the provided selector.</p>
						)
					) : (
						<p className="text-sm text-muted-foreground">Provide a selector to check DKIM.</p>
					)}
					<Issues issues={result.dkim.issues} filter={severityFilter} />
				</CardContent>
			</Card>

			{/* DKIM Discovery */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-2">DKIM Discovery</h3>
					{result.dkimDiscovery.found.length > 0 ? (
						<div className="space-y-2">
							{result.dkimDiscovery.found.map((f) => (
								<div key={f.selector} className="text-sm">
									<span className="font-mono">{f.selector}</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No DKIM selectors discovered in the common list.</p>
					)}
					<Issues issues={result.dkimDiscovery.issues} filter={severityFilter} />
				</CardContent>
			</Card>
		</div>
	);
}

function Issues({
	issues,
	filter,
}: {
	issues: DomainAnalysis['mx']['issues'] | DomainAnalysis['spf']['issues'];
	filter: { error: boolean; warning: boolean; info: boolean };
}) {
	if (!issues || issues.length === 0) return null;
	const filtered = issues.filter((i) =>
		(i.severity === 'error' && filter.error) ||
		(i.severity === 'warning' && filter.warning) ||
		(i.severity === 'info' && filter.info),
	);
	if (filtered.length === 0) return null;
	return (
		<div className="mt-3 space-y-1">
			{filtered.map((i, idx) => (
				<div key={idx} className="text-xs">
					<span
						className={
							i.severity === 'error'
								? 'text-red-600 dark:text-red-400'
								: i.severity === 'warning'
								? 'text-amber-600 dark:text-amber-400'
								: 'text-gray-600 dark:text-gray-400'
						}
					>
						{i.severity.toUpperCase()}
					</span>
					{': '}
					<span>{i.summary}</span>
					{i.detail ? <span className="text-muted-foreground"> — {i.detail}</span> : null}
					{renderHint(i)}
				</div>
			))}
		</div>
	);
}

function renderHint(issue: DnsIssue) {
	const s = (issue.summary || '').toLowerCase();
	let hint: string | undefined;
	if (s.includes('no spf')) {
		hint = 'Add TXT at root like: v=spf1 include:spf.example.com -all';
	} else if (s.includes('spf ends with +all')) {
		hint = 'Change +all to ~all or -all to avoid allowing any sender.';
	} else if (s.includes('no dmarc')) {
		hint = 'Add TXT _dmarc: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain';
	} else if (s.includes('dmarc policy is none')) {
		hint = 'Move to p=quarantine or p=reject after monitoring reports.';
	} else if (s.includes('no dkim')) {
		hint = 'Publish selector TXT at selector._domainkey with v=DKIM1; k=rsa; p=...';
	} else if (s.includes('no tls-rpt')) {
		hint = 'Add TXT _smtp._tls: v=TLSRPTv1; rua=mailto:tlsrpt@yourdomain';
	} else if (s.includes('no mta-sts')) {
		hint = 'Add _mta-sts TXT and host https://mta-sts.yourdomain/.well-known/mta-sts.txt';
	} else if (s.includes('no bimi')) {
		hint = 'Add default._bimi TXT with v=BIMI1; l=https://.../logo.svg; a=';
	}
	return hint ? <div className="text-[11px] text-blue-600 dark:text-blue-400">Fix hint: {hint}</div> : null;
}


