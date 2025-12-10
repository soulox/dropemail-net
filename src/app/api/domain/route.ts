import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { z } from 'zod';
import { DomainAnalysis, DmarcResult, DkimResult, SpfResult, DnsIssue, BimiResult, MtastsResult, TlsRptResult, DkimDiscoveryResult, BlacklistResults, ReputationSummary, MxRecordInfo, DnsblListing, SimulationResults, DmarcScenarioOutcome, StarttlsCheck } from '@/types/domain';

export const runtime = 'nodejs';
const API_VERSION = '1.2.0';
const TIMEOUTS = { dnsMs: 3000, fetchMs: 5000, smtpMs: 4000 };

const BodySchema = z.object({
	domain: z.string().trim().min(1).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain'),
	dkimSelector: z.string().trim().optional(),
	headerFrom: z.string().trim().optional(),
	envelopeFrom: z.string().trim().optional(),
	quickTest: z.boolean().optional(),
	compelTls: z.boolean().optional(),
	directTls: z.boolean().optional(),
	ports: z.array(z.number().int().positive()).max(3).optional(), // e.g., [25,465,587]
	stopAfter: z.enum(['ANSWER','CONNECT','EHLO1','STARTTLS','EHLO2','MAILFROM','RCPTTO','DATA']).optional(),
	mxHostLimit: z.number().int().positive().max(10).optional(),
});

export async function POST(request: NextRequest) {
	try {
		const parsed = BodySchema.safeParse(await request.json());
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
		}
		const body = parsed.data;
		const domain = body.domain.toLowerCase();
		const dkimSelector = (body.dkimSelector || '').toLowerCase();
		const headerFrom = (body.headerFrom || domain).toLowerCase();
		const envelopeFrom = (body.envelopeFrom || domain).toLowerCase();
		const quickTest = !!body.quickTest;
		const compelTls = !!body.compelTls;
		const directTls = !!body.directTls;
		const ports = body.ports && body.ports.length ? body.ports : [25];
		const stopAfter = body.stopAfter;
		const mxHostLimit = body.mxHostLimit;

		const timings: Record<string, number> = {};
		const timePromise = <T,>(name: string, p: Promise<T>): Promise<T> => {
			const start = Date.now();
			return p.finally(() => {
				timings[name] = Date.now() - start;
			});
		};

		const [mx, spf, dmarc, dkim, bimi, mtasts, tlsrpt, dkimDiscovery] = await Promise.all([
			timePromise('mx', resolveMxWithGeo(domain, mxHostLimit)),
			timePromise('spf', resolveSpf(domain)),
			timePromise('dmarc', resolveDmarc(domain)),
			timePromise('dkim', resolveDkim(domain, dkimSelector)),
			timePromise('bimi', resolveBimi(domain)),
			timePromise('mta-sts', resolveMtasts(domain)),
			timePromise('tls-rpt', resolveTlsRpt(domain)),
			timePromise('dkim-discovery', discoverDkimSelectors(domain)),
		]);

		// Blacklists for domain and MX IPs
		const blacklists = await timePromise('blacklists', resolveBlacklists(domain, mx.records));
		const reputation = computeReputation({ spf, dmarc, blacklists });
		const simulations = simulateDmarc({ domain, spf, dmarc, headerFrom, envelopeFrom });
		const starttls = await timePromise('starttls', checkStarttls(mx.records, mtasts, { quickTest, compelTls, directTls, ports, stopAfter }));

		const response: DomainAnalysis = {
			domain,
			mx,
			spf,
			dmarc,
			dkim,
			bimi,
			mtasts,
			tlsrpt,
			dkimDiscovery,
			blacklists,
			reputation,
			simulations,
			starttls,
			meta: {
				queryTimestamp: new Date().toISOString(),
				apiVersion: API_VERSION,
				timings,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error('Domain analysis error:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to analyze domain' },
			{ status: 500 },
		);
	}
}

function getOrgDomain(d: string): string {
	const parts = d.split('.').filter(Boolean);
	if (parts.length <= 2) return d;
	return parts.slice(-2).join('.');
}

function simulateDmarc({
	domain,
	spf,
	headerFrom,
	envelopeFrom,
}: {
	domain: string;
	spf: SpfResult;
	dmarc: DmarcResult;
	headerFrom: string;
	envelopeFrom: string;
}): SimulationResults {
	const input = {
		headerFrom,
		envelopeFrom,
		assumedDkimDomain: domain,
	};
	const adkimOptions: Array<'r' | 's'> = ['r', 's'];
	const aspfOptions: Array<'r' | 's'> = ['r', 's'];
	const policyOptions: Array<'none' | 'quarantine' | 'reject'> = ['none', 'quarantine', 'reject'];

	const headerOrg = getOrgDomain(headerFrom);
	const spfOrg = getOrgDomain(envelopeFrom);
	const dkimOrg = getOrgDomain(domain);

	const scenarios: DmarcScenarioOutcome[] = [];
	for (const p of policyOptions) {
		for (const adkim of adkimOptions) {
			for (const aspf of aspfOptions) {
				const dkimAligned =
					adkim === 's' ? domain === headerFrom : dkimOrg === headerOrg;
				const spfAligned =
					aspf === 's' ? envelopeFrom === headerFrom : spfOrg === headerOrg;
				const dkimPassAligned = dkimAligned; // assume DKIM signature is valid for simulation
				const spfPassAligned = spf.found ? spfAligned : false; // assume SPF auth ok when record exists

				const alignedPass = dkimPassAligned || spfPassAligned;
				let disposition: 'none' | 'quarantine' | 'reject' = 'none';
				if (!alignedPass) {
					disposition = p;
				}

				const passBy: 'dkim' | 'spf' | 'none' = dkimPassAligned ? 'dkim' : spfPassAligned ? 'spf' : 'none';
				const notes: string[] = [];
				if (passBy === 'none') notes.push('Neither DKIM nor SPF aligned with header From');
				if (passBy === 'dkim') notes.push(`DKIM domain (${domain}) aligned with header From (${headerFrom}) under ${adkim.toUpperCase()} alignment`);
				if (passBy === 'spf') notes.push(`SPF envelope From (${envelopeFrom}) aligned with header From (${headerFrom}) under ${aspf.toUpperCase()} alignment`);

				scenarios.push({ policy: p, adkim, aspf, alignedPass, passBy, disposition, notes });
			}
		}
	}
	return { input, scenarios };
}

async function checkStarttls(
	mxRecords: MxRecordInfo[],
	mtasts: MtastsResult | undefined,
	opts: { quickTest: boolean; compelTls: boolean; directTls: boolean; ports: number[]; stopAfter?: string },
): Promise<{ checks: StarttlsCheck[]; issues: DnsIssue[] }> {
	const issues: DnsIssue[] = [];
	const checks: StarttlsCheck[] = [];
	const mxLimit = opts.quickTest ? 1 : 3;
	const targets = mxRecords.slice(0, mxLimit);

	for (const mx of targets) {
		const host = mx.exchange;
		const ip = mx.addresses?.[0];
		for (const port of (opts.ports.length ? opts.ports : [25])) {
			try {
				const result = await smtpStarttlsProbe(host, port, TIMEOUTS.smtpMs, {
					compelTls: opts.compelTls,
					directTls: opts.directTls && port === 465,
					stopAfter: opts.quickTest ? 'EHLO2' : opts.stopAfter,
				});
				const mtastsOk = !!(mtasts?.foundPolicy && mtasts.policy?.mode && mtasts.policy.mode !== 'none');
				const daneOk: StarttlsCheck['daneOk'] = 'not tested';
				const answer = ip ? `${ip}:${port}` : undefined;
				const score = computeTlsScore(result);
				checks.push({
					host,
					ip,
					mxPref: mx.priority,
					answer,
					...result,
					mtastsOk,
					daneOk,
					score,
					issues: [],
				});
			} catch (e) {
				checks.push({
					host,
					ip,
					mxPref: mx.priority,
					answer: ip ? `${ip}:${port}` : undefined,
					connectOk: false,
					daneOk: 'not tested',
					issues: [
						{
							severity: 'warning',
							summary: 'SMTP connection failed',
							detail: e instanceof Error ? e.message : String(e),
						},
					],
				});
			}
			if (opts.quickTest) break;
		}
	}
	return { checks, issues };
}

async function smtpStarttlsProbe(
	host: string,
	port: number,
	timeoutMs: number,
	options?: { compelTls?: boolean; directTls?: boolean; stopAfter?: string },
): Promise<Omit<StarttlsCheck, 'host' | 'issues'>> {
	const result: Omit<StarttlsCheck, 'host' | 'issues'> = {
		connectOk: false,
		heloOk: false,
		starttlsSupported: false,
		tlsEstablished: false,
		certAuthorized: false,
		secureOk: false,
		mailFromOk: false,
	};
	const transcript: string[] = [];
	const timings: NonNullable<StarttlsCheck['timings']> = {};
	const socket = options?.directTls ? undefined : net.connect({ host, port });
	const buffer: { data: string } = { data: '' };
	const until = (s: net.Socket, pattern: RegExp, toMs: number): Promise<string> =>
		new Promise((resolve, reject) => {
			const onData = (d: Buffer) => {
				buffer.data += d.toString('utf8');
				if (pattern.test(buffer.data)) {
					s.off('data', onData);
					if (timer) clearTimeout(timer);
					const out = buffer.data;
					buffer.data = '';
					resolve(out);
				}
			};
			s.on('data', onData);
			const timer = setTimeout(() => {
				s.off('data', onData);
				reject(new Error('Timeout'));
			}, toMs);
		});
	const push = (line: string) => transcript.push(line);
	return await new Promise((resolve) => {
		let closed = false;
		const closeAll = () => {
			if (closed) return;
			closed = true;
			try { socket?.destroy(); } catch {}
		};
		const onError = () => {
			closeAll();
			resolve({ ...result, timings, transcript });
		};
		if (!options?.directTls) {
			socket!.once('error', onError);
		}
		const onConnectPlain = async () => {
			try {
				const t0 = Date.now();
				const banner = await until(socket!, /^220\b/m, timeoutMs);
				push(`<-- ${banner.trim()}`);
				timings.connectMs = Date.now() - t0;
				result.connectOk = true;
				socket!.write(`EHLO probe.dropemail\r\n`);
				push(`--> EHLO probe.dropemail`);
				const t1 = Date.now();
				const ehloResp = await until(socket!, /^250[ -]/m, timeoutMs);
				push(`<-- ${ehloResp.trim()}`);
				timings.heloMs = Date.now() - t1;
				result.heloOk = true;
				result.starttlsSupported = /STARTTLS/i.test(ehloResp);
				if (!result.starttlsSupported && !options?.compelTls) {
					closeAll();
					resolve({ ...result, timings, transcript });
					return;
				}
				socket!.write(`STARTTLS\r\n`);
				push(`--> STARTTLS`);
				const t2 = Date.now();
				const ready = await until(socket!, /^220\b.*(Start TLS|ready to start tls)/i, timeoutMs);
				push(`<-- ${ready.trim()}`);
				timings.starttlsOfferMs = Date.now() - t2;
				// Upgrade to TLS
				const secure = tls.connect({ socket: socket!, servername: host });
				secure.once('error', () => {
					try { secure.destroy(); } catch {}
					closeAll();
					resolve({ ...result, timings, transcript });
				});
				secure.once('secureConnect', async () => {
					timings.tlsHandshakeMs = Date.now() - t2;
					result.tlsEstablished = true;
					const proto = secure.getProtocol();
					const cipher = secure.getCipher();
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const cert: any = secure.getPeerCertificate();
					result.tlsProtocol = proto || undefined;
					result.cipher = cipher?.name;
					result.certSubjectCN = cert?.subject?.CN;
					result.certValidFrom = cert?.valid_from;
					result.certValidTo = cert?.valid_to;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					result.certAuthorized = (secure as any).authorized ?? false;
					// Secure OK: TLS >= 1.2 and PFS cipher
					const pfs = (result.cipher || '').toUpperCase().includes('ECDHE') || (result.cipher || '').toUpperCase().includes('DHE');
					const v = (result.tlsProtocol || '').toUpperCase();
					const modern = v.includes('TLSV1.3') || v.includes('TLSV1.2');
					result.secureOk = pfs && modern;
					if (options?.stopAfter === 'STARTTLS') {
						try { secure.end(); } catch {}
						closeAll();
						resolve({ ...result, timings, transcript });
						return;
					}
					// Post-TLS EHLO and MAIL FROM
					try {
						secure.write(`EHLO probe.dropemail\r\n`);
						push(`~~> EHLO probe.dropemail`);
						const ehlo2 = await until(secure as unknown as net.Socket, /^250[ -]/m, timeoutMs);
						push(`<~~ ${ehlo2.trim()}`);
						if (options?.stopAfter === 'EHLO2') {
							try { secure.end(); } catch {}
							closeAll();
							resolve({ ...result, timings, transcript });
							return;
						}
						const t3 = Date.now();
						secure.write(`MAIL FROM:<test@${host}>\r\n`);
						push(`~~> MAIL FROM:<test@${host}>`);
						const mfrom = await until(secure as unknown as net.Socket, /^250\b/m, timeoutMs + 3000);
						push(`<~~ ${mfrom.trim()}`);
						timings.mailFromMs = Date.now() - t3;
						result.mailFromOk = true;
					} catch {
						// ignore
					}
					try { secure.end(); } catch {}
					closeAll();
					resolve({ ...result, timings, transcript });
				});
			} catch {
				closeAll();
				resolve({ ...result, timings, transcript });
			}
		};
		if (options?.directTls) {
			// Direct TLS (e.g., port 465)
			const t2 = Date.now();
			const secure = tls.connect({ host, port, servername: host });
			secure.once('error', () => {
				try { secure.destroy(); } catch {}
				resolve({ ...result, timings, transcript });
			});
			secure.once('secureConnect', async () => {
				timings.tlsHandshakeMs = Date.now() - t2;
				result.connectOk = true;
				result.tlsEstablished = true;
				const proto = secure.getProtocol();
				const cipher = secure.getCipher();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const cert: any = secure.getPeerCertificate();
				result.tlsProtocol = proto || undefined;
				result.cipher = cipher?.name;
				result.certSubjectCN = cert?.subject?.CN;
				result.certValidFrom = cert?.valid_from;
				result.certValidTo = cert?.valid_to;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				result.certAuthorized = (secure as any).authorized ?? false;
				const pfs = (result.cipher || '').toUpperCase().includes('ECDHE') || (result.cipher || '').toUpperCase().includes('DHE');
				const v = (result.tlsProtocol || '').toUpperCase();
				const modern = v.includes('TLSV1.3') || v.includes('TLSV1.2');
				result.secureOk = pfs && modern;
				// EHLO
				secure.write(`EHLO probe.dropemail\r\n`);
				await until(secure as unknown as net.Socket, /^250[ -]/m, timeoutMs);
				result.heloOk = true;
				if (options?.stopAfter === 'EHLO2') {
					try { secure.end(); } catch {}
					resolve({ ...result, timings, transcript });
					return;
				}
				// MAIL FROM (may be rejected on 465)
				try {
					const t3 = Date.now();
					secure.write(`MAIL FROM:<test@${host}>\r\n`);
					await until(secure as unknown as net.Socket, /^250\b/m, timeoutMs + 3000);
					timings.mailFromMs = Date.now() - t3;
					result.mailFromOk = true;
				} catch {}
				try { secure.end(); } catch {}
				resolve({ ...result, timings, transcript });
			});
		} else {
			socket!.once('connect', onConnectPlain);
		}
	});
}

function computeTlsScore(r: Omit<StarttlsCheck, 'host' | 'issues'>): number {
	let score = 0;
	const add = (cond: boolean, pts: number) => { if (cond) score += pts; };
	add(!!r.connectOk, 20);
	add(!!r.heloOk, 10);
	add(!!r.starttlsSupported, 15);
	add(!!r.tlsEstablished, 15);
	add(!!r.certAuthorized, 15);
	add(!!r.secureOk, 10);
	add(!!r.mailFromOk, 15);
	return Math.round(score);
}

const cache = new Map<string, { expiresAt: number; value: unknown }>();
function getCached<T>(key: string): T | undefined {
	const entry = cache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt < Date.now()) {
		cache.delete(key);
		return undefined;
	}
	return entry.value as T;
}
function setCached<T>(key: string, value: T, ttlMs = 10 * 60 * 1000) {
	cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function resolveMxWithGeo(domain: string, mxHostLimit?: number): Promise<DomainAnalysis['mx']> {
	const issues: DnsIssue[] = [];
	try {
		const records = await dnsResolveMx(domain);
		const sortedAll = [...records].sort((a, b) => a.priority - b.priority);
		const sorted = typeof mxHostLimit === 'number' ? sortedAll.slice(0, mxHostLimit) : sortedAll;
		const mxRecords: MxRecordInfo[] = [];
		for (const r of sorted) {
			const item: MxRecordInfo = { exchange: r.exchange, priority: r.priority };
			try {
				const key = `a:${r.exchange}`;
				let addresses = getCached<string[]>(key);
				if (!addresses) {
					addresses = await dnsResolve4Safe(r.exchange);
					setCached(key, addresses, 10 * 60 * 1000);
				}
				item.addresses = addresses;
				if (addresses.length > 0) {
					item.geo = await mapLimit(addresses, 5, async (ip) => {
							const gk = `geo:${ip}`;
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							let geo = getCached<any>(gk);
							if (!geo) {
								geo = await retryOperation(() => geolocateIp(ip), 2, 250);
								setCached(gk, geo, 60 * 60 * 1000);
							}
							return { ip, ...geo };
						});
				}
			} catch {
				// ignore resolution errors per MX
			}
			mxRecords.push(item);
		}
		if (mxRecords.length === 0) {
			issues.push({
				severity: 'error',
				summary: 'No MX records found',
				detail: 'Add MX records pointing to your mail server/provider.',
			});
		}
		return { found: mxRecords.length > 0, records: mxRecords, issues };
	} catch (e) {
		issues.push({
			severity: 'error',
			summary: 'Failed to resolve MX',
			detail: toDnsError(e),
		});
		return { found: false, records: [], issues };
	}
}

async function resolveSpf(domain: string): Promise<SpfResult> {
	const issues: DnsIssue[] = [];
	let record: string | undefined;
	let validSyntax = false;
	let mechanisms: string[] | undefined;
	let allMechanism: string | undefined;

	try {
		const txtRecords = await dnsResolveTxt(domain);
		const flat = txtRecords.map((chunks) => chunks.join('')).map((s) => s.trim());
		record = flat.find((t) => t.toLowerCase().startsWith('v=spf1'));

		if (!record) {
			issues.push({
				severity: 'error',
				summary: 'No SPF record found',
				detail: `Publish a TXT record at ${domain} with "v=spf1 ..."`,
			});
			return { found: false, record: undefined, validSyntax: false, issues };
		}

		// Basic syntax validation
		validSyntax = /^v=spf1(\s+[-+~?]?(a|mx|ip4:[^s]+|ip6:[^s]+|include:[^s]+|exists:[^s]+|ptr|all|redirect=[^s]+))*\s*$/i.test(
			record.replace(/\s+/g, ' '),
		);
		if (!validSyntax) {
			issues.push({
				severity: 'error',
				summary: 'SPF syntax looks invalid',
				detail: 'Check for stray characters or malformed mechanisms.',
			});
		}

		const tokens = record.split(/\s+/).slice(1);
		mechanisms = tokens.filter((t) => !t.startsWith('redirect='));
		allMechanism = tokens.find((t) => /all$/i.test(t));

		// Guidance on all mechanism
		if (!allMechanism) {
			issues.push({
				severity: 'warning',
				summary: 'No all mechanism at the end',
				detail: 'Add ~all or -all at the end to define default behavior.',
			});
		} else if (/^\+?all$/i.test(allMechanism)) {
			issues.push({
				severity: 'error',
				summary: 'SPF ends with +all (permits anything)',
				detail: 'Use ~all (softfail) or -all (fail) to restrict senders.',
			});
		}

		// Check includes count (flattening hint)
		const includeCount = mechanisms.filter((m) => /^[-+~?]?include:/i.test(m)).length;
		if (includeCount > 10) {
			issues.push({
				severity: 'warning',
				summary: 'Too many include mechanisms',
				detail: 'SPF has a 10-DNS-lookup limit; consider flattening.',
			});
		}

		return { found: true, record, validSyntax, mechanisms, allMechanism, issues };
	} catch (e) {
		issues.push({
			severity: 'error',
			summary: 'Failed to resolve SPF',
			detail: toDnsError(e),
		});
		return { found: false, record, validSyntax, issues };
	}
}

async function resolveDmarc(domain: string): Promise<DmarcResult> {
	const name = `_dmarc.${domain}`;
	const issues: DnsIssue[] = [];
	let record: string | undefined;
	let validSyntax = false;
	let policy: DmarcResult['policy'];
	let subdomainPolicy: DmarcResult['subdomainPolicy'];
	let pct: number | undefined;
	let rua: string[] | undefined;
	let ruf: string[] | undefined;
	let alignment: DmarcResult['alignment'];

	try {
		const txtRecords = await dnsResolveTxt(name);
		const flat = txtRecords.map((chunks) => chunks.join('')).map((s) => s.trim());
		record = flat.find((t) => t.toLowerCase().startsWith('v=dmarc1'));
		if (!record) {
			issues.push({
				severity: 'error',
				summary: 'No DMARC record found',
				detail: `Publish a TXT record at ${name} with "v=DMARC1; p=..."`,
			});
			return {
				found: false,
				record: undefined,
				validSyntax: false,
				policy,
				subdomainPolicy,
				pct,
				rua,
				ruf,
				alignment,
				issues,
			};
		}

		validSyntax = /^v=dmarc1;/i.test(record);
		if (!validSyntax) {
			issues.push({
				severity: 'error',
				summary: 'DMARC syntax looks invalid',
				detail: 'Record must start with "v=DMARC1;"',
			});
		}

		const kv = Object.fromEntries(
			record
				.split(';')
				.map((s) => s.trim())
				.filter(Boolean)
				.map((p) => {
					const [k, ...rest] = p.split('=');
					return [k.toLowerCase(), rest.join('=').trim()];
				}),
		);

		const p = (kv['p'] || '').toLowerCase();
		if (p === 'none' || p === 'quarantine' || p === 'reject') {
			policy = p;
		} else {
			issues.push({
				severity: 'warning',
				summary: 'No valid policy (p) found',
				detail: 'Set p=quarantine or p=reject for protection.',
			});
		}

		const sp = (kv['sp'] || '').toLowerCase();
		if (sp === 'none' || sp === 'quarantine' || sp === 'reject') {
			subdomainPolicy = sp;
		}

		if (kv['pct']) {
			const n = Number(kv['pct']);
			if (!isNaN(n)) pct = Math.min(100, Math.max(0, Math.round(n)));
		}

		if (kv['rua']) {
			rua = kv['rua']
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		if (kv['ruf']) {
			ruf = kv['ruf']
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}

		const adkim = (kv['adkim'] || 'r') as 'r' | 's';
		const aspf = (kv['aspf'] || 'r') as 'r' | 's';
		alignment = { adkim, aspf };

		if (policy === 'none') {
			issues.push({
				severity: 'warning',
				summary: 'DMARC policy is none',
				detail: 'Consider p=quarantine or p=reject to enforce protection.',
			});
		}

		return {
			found: true,
			record,
			validSyntax,
			policy,
			subdomainPolicy,
			pct,
			rua,
			ruf,
			alignment,
			issues,
		};
	} catch (e) {
		issues.push({
			severity: 'error',
			summary: 'Failed to resolve DMARC',
			detail: toDnsError(e),
		});
		return {
			found: false,
			record,
			validSyntax,
			policy,
			subdomainPolicy,
			pct,
			rua,
			ruf,
			alignment,
			issues,
		};
	}
}

async function resolveDkim(domain: string, selector?: string): Promise<DkimResult> {
	const issues: DnsIssue[] = [];
	if (!selector) {
		return {
			checked: false,
			selector: undefined,
			found: false,
			record: undefined,
			keyType: undefined,
			keyLengthBits: undefined,
			issues: [
				{
					severity: 'info',
					summary: 'DKIM selector not provided',
					detail: 'Provide a selector to check DKIM (e.g., selector1).',
				},
			],
		};
	}

	const name = `${selector}._domainkey.${domain}`;
	try {
		const txtRecords = await dns.resolveTxt(name);
		const flat = txtRecords.map((chunks) => chunks.join('')).map((s) => s.trim());
		const record = flat.find((t) => /^v=dkim1;/i.test(t)) ?? flat[0];
		if (!record) {
			issues.push({
				severity: 'error',
				summary: 'No DKIM record found',
				detail: `Expected TXT record at ${name}`,
			});
			return { checked: true, selector, found: false, record: undefined, keyType: undefined, keyLengthBits: undefined, issues };
		}
		const { keyType, keyLengthBits } = parseDkimKey(record);
		return { checked: true, selector, found: true, record, keyType, keyLengthBits, issues };
	} catch (e) {
		issues.push({
			severity: 'error',
			summary: 'Failed to resolve DKIM',
			detail: toDnsError(e),
		});
		return { checked: true, selector, found: false, record: undefined, keyType: undefined, keyLengthBits: undefined, issues };
	}
}

function parseDkimKey(record: string): { keyType: DkimResult['keyType']; keyLengthBits?: number } {
	const t = record.toLowerCase();
	let keyType: DkimResult['keyType'] = 'unknown';
	if (t.includes('k=rsa')) keyType = 'rsa';
	if (t.includes('k=ed25519')) keyType = 'ed25519';

	// Rough estimation of RSA key length from base64 p=
	const pMatch = record.match(/p=([A-Za-z0-9+/=]+)/);
	if (pMatch && pMatch[1]) {
		try {
			// base64 decoded length in bytes multiplied by 8 (bits)
			const keyLengthBits = Math.round((Buffer.from(pMatch[1], 'base64').length || 0) * 8 * 0.73);
			return { keyType, keyLengthBits: keyType === 'rsa' ? keyLengthBits : undefined };
		} catch {
			return { keyType };
		}
	}
	return { keyType };
}

async function resolveBimi(domain: string, selector = 'default'): Promise<BimiResult> {
	const name = `${selector}._bimi.${domain}`;
	const issues: DnsIssue[] = [];
	try {
		const txt = await dnsResolveTxt(name);
		const flat = txt.map((r) => r.join('')).map((s) => s.trim());
		const record = flat.find((t) => /^v=bimi1;/i.test(t)) ?? flat[0];
		if (!record) {
			issues.push({ severity: 'error', summary: 'No BIMI record found', detail: `Expected TXT at ${name}` });
			return { found: false, selector, issues };
		}
		const kv = Object.fromEntries(
			record
				.split(';')
				.map((s) => s.trim())
				.filter(Boolean)
				.map((p) => {
					const [k, ...rest] = p.split('=');
					return [k.toLowerCase(), rest.join('=').trim()];
				}),
		) as Record<string, string>;
		const logoUrl = kv['l'];
		const authority = kv['a'];

		let validSvg: boolean | undefined;
		if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
			const res = await fetchWithTimeout(logoUrl, 5000);
			if (res.ok) {
				const ct = res.headers.get('content-type') || '';
				if (ct.includes('image/svg')) {
					validSvg = true;
				} else {
					const text = await res.text();
					validSvg = text.trim().toLowerCase().includes('<svg');
				}
			} else {
				issues.push({ severity: 'warning', summary: 'Unable to fetch BIMI logo URL', detail: `${res.status}` });
			}
		} else if (logoUrl) {
			issues.push({ severity: 'warning', summary: 'BIMI logo URL is not http(s)', detail: logoUrl });
		}

		return { found: true, selector, record, logoUrl, authority, validSvg, issues };
	} catch (e) {
		issues.push({ severity: 'error', summary: 'Failed to resolve BIMI', detail: toDnsError(e) });
		return { found: false, selector, issues };
	}
}

async function resolveMtasts(domain: string): Promise<MtastsResult> {
	const txtName = `_mta-sts.${domain}`;
	const issues: DnsIssue[] = [];
	let id: string | undefined;
	let foundTxt = false;
	try {
		const txt = await dnsResolveTxt(txtName);
		const flat = txt.map((r) => r.join('')).map((s) => s.trim());
		const rec = flat.find((t) => /^v=stsv1;/i.test(t)) ?? flat[0];
		if (rec) {
			foundTxt = true;
			const kv = Object.fromEntries(
				rec
					.split(';')
					.map((s) => s.trim())
					.filter(Boolean)
					.map((p) => {
						const [k, ...rest] = p.split('=');
						return [k.toLowerCase(), rest.join('=').trim()];
					}),
			) as Record<string, string>;
			id = kv['id'];
		} else {
			issues.push({ severity: 'warning', summary: 'No MTA-STS TXT found', detail: `Expected TXT at ${txtName}` });
		}
	} catch (e) {
		issues.push({ severity: 'error', summary: 'Failed to resolve MTA-STS TXT', detail: toDnsError(e) });
	}

	let foundPolicy = false;
	let policy: MtastsResult['policy'];
	try {
		const url = `https://mta-sts.${domain}/.well-known/mta-sts.txt`;
		const res = await retryOperation(() => fetchWithTimeout(url, TIMEOUTS.fetchMs), 2, 300);
		if (res.ok) {
			const text = await res.text();
			const lines = text
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter((l) => !!l && !l.startsWith('#'));
			const kv = Object.fromEntries(
				lines
					.map((line) => {
						const [k, ...rest] = line.split(':');
						return [k.trim().toLowerCase(), rest.join(':').trim()];
					})
					.filter(([k]) => !!k),
			) as Record<string, string>;
			policy = {
				version: (kv['version'] as 'STSv1') || undefined,
				mode: (kv['mode'] as 'enforce' | 'testing' | 'none') || undefined,
				maxAge: kv['max_age'] ? Number(kv['max_age']) : undefined,
				mx: lines.filter((l) => l.toLowerCase().startsWith('mx:')).map((l) => l.split(':')[1].trim()),
				raw: text,
			};
			foundPolicy = true;
		} else {
			issues.push({ severity: 'warning', summary: 'Failed to fetch MTA-STS policy', detail: `${res.status}` });
		}
	} catch (e) {
		issues.push({ severity: 'error', summary: 'Error fetching MTA-STS policy', detail: e instanceof Error ? e.message : String(e) });
	}

	return { foundTxt, id, foundPolicy, policy, issues };
}

async function resolveTlsRpt(domain: string): Promise<TlsRptResult> {
	const name = `_smtp._tls.${domain}`;
	const issues: DnsIssue[] = [];
	try {
		const txt = await dnsResolveTxt(name);
		const flat = txt.map((r) => r.join('')).map((s) => s.trim());
		const record = flat.find((t) => /^v=tlsrptv1;/i.test(t)) ?? flat[0];
		if (!record) {
			issues.push({ severity: 'warning', summary: 'No TLS-RPT record found', detail: `Expected TXT at ${name}` });
			return { found: false, issues };
		}
		const kv = Object.fromEntries(
			record
				.split(';')
				.map((s) => s.trim())
				.filter(Boolean)
				.map((p) => {
					const [k, ...rest] = p.split('=');
					return [k.toLowerCase(), rest.join('=').trim()];
				}),
		) as Record<string, string>;
		const rua = (kv['rua'] || '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return { found: true, record, rua, issues };
	} catch (e) {
		issues.push({ severity: 'error', summary: 'Failed to resolve TLS-RPT', detail: toDnsError(e) });
		return { found: false, issues };
	}
}

async function discoverDkimSelectors(domain: string): Promise<DkimDiscoveryResult> {
	const issues: DnsIssue[] = [];
	const selectors = ['default', 'selector1', 'selector2', 'k1', 's1', 'google', 'mail', 'mx', 'smtp'];
	const found: DkimDiscoveryResult['found'] = [];
	await mapLimit(selectors, 5, async (sel) => {
			try {
				const name = `${sel}._domainkey.${domain}`;
				const txt = await dnsResolveTxt(name);
				const flat = txt.map((r) => r.join('')).map((s) => s.trim());
				const record = flat.find((t) => /^v=dkim1;/i.test(t)) ?? flat[0];
				if (record) {
					found.push({ selector: sel, record });
				}
			} catch {
				// ignore NXDOMAIN or failures per selector
			}
		});
	return { selectorsTried: selectors, found, issues };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
	const ctrl = new AbortController();
	const id = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		// Node runtime supports global fetch
		const res = await fetch(url, { signal: ctrl.signal });
		return res;
	} finally {
		clearTimeout(id);
	}
}

async function geolocateIp(ip: string): Promise<{
	country?: string;
	countryCode?: string;
	region?: string;
	city?: string;
	org?: string;
	asn?: string;
	latitude?: number;
	longitude?: number;
}> {
	// Try cache-aware fetch
	const url = `https://ipapi.co/${ip}/json/`;
	try {
		const res = await retryOperation(() => fetchWithTimeout(url, TIMEOUTS.fetchMs), 1, 250);
		if (!res.ok) return {};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const j = (await res.json()) as any;
		return {
			country: j.country_name,
			countryCode: j.country,
			region: j.region,
			city: j.city,
			org: j.org || j.org_name || j.asn_org || j.org_name || undefined,
			asn: j.asn ? String(j.asn) : undefined,
			latitude: typeof j.latitude === 'number' ? j.latitude : j.latitude ? Number(j.latitude) : undefined,
			longitude: typeof j.longitude === 'number' ? j.longitude : j.longitude ? Number(j.longitude) : undefined,
		};
	} catch {
		return {};
	}
}

async function resolveBlacklists(domain: string, mxRecords: MxRecordInfo[]): Promise<BlacklistResults> {
	const issues: DnsIssue[] = [];
	// Domain blacklists - reputable and commonly used
	const domainLists = [
		'dbl.spamhaus.org',           // Spamhaus Domain Block List
		'multi.surbl.org',            // SURBL Multi
		'uribl.com',                  // URIBL
	];
	// IP blacklists - reputable and commonly used (matching standard blacklist checkers)
	// Note: Using individual Spamhaus lists + ZEN for comprehensive coverage
	const ipLists = [
		'zen.spamhaus.org',           // Spamhaus ZEN (combines SBL, XBL, PBL) - most comprehensive
		'sbl.spamhaus.org',           // Spamhaus Spam Block List
		'xbl.spamhaus.org',           // Spamhaus Exploits Block List
		'pbl.spamhaus.org',           // Spamhaus Policy Block List
		'b.barracudacentral.org',     // Barracuda
		'bl.spamcop.net',             // SpamCop
		'dnsbl.sorbs.net',            // SORBS
		'bl.spamrats.com',            // SpamRATS
		'ips.backscatterer.org',      // Backscatterer
		'bl.blocklist.de',            // blocklist.de
		'dnsbl-1.uceprotect.net',     // UCEPROTECT Level 1 (Level 2/3 removed - too aggressive)
	];

	// Domain checks
	const domainResults: DnsblListing[] = await Promise.all(
		domainLists.map(async (list) => {
			const host = `${domain}.${list}`;
			const key = `rbl:domain:${host}`;
			let result = getCached<{ listed: boolean; responseCode?: string }>(key);
			if (result === undefined) {
				result = await dnsblListed(host);
				setCached(key, result, 10 * 60 * 1000);
			}
			const message = result.listed 
				? (result.responseCode ? `Listed (${result.responseCode})` : 'Listed')
				: 'Not listed';
			return { list, type: 'domain', listed: result.listed, responseCode: result.responseCode, message };
		}),
	);

	// IP checks per MX IP
	const ips: Record<string, DnsblListing[]> = {};
	const uniqueIps = Array.from(new Set(mxRecords.flatMap((m) => m.addresses || [])));
	await mapLimit(uniqueIps, 5, async (ip) => {
			const listings: DnsblListing[] = [];
			for (const list of ipLists) {
				const reversed = ip.split('.').reverse().join('.');
				const host = `${reversed}.${list}`;
				const key = `rbl:ip:${host}`;
				let result = getCached<{ listed: boolean; responseCode?: string }>(key);
				if (result === undefined) {
					result = await dnsblListed(host);
					setCached(key, result, 10 * 60 * 1000);
				}
				const message = result.listed 
					? (result.responseCode ? `Listed (${result.responseCode})` : 'Listed')
					: 'Not listed';
				listings.push({ list, type: 'ip', listed: result.listed, responseCode: result.responseCode, message });
			}
			ips[ip] = listings;
		});

	return { domain: domainResults, ips, issues };
}

async function dnsblListed(host: string): Promise<{ listed: boolean; responseCode?: string }> {
	try {
		const addrs = await withTimeout(dns.resolve4(host), TIMEOUTS.dnsMs);
		// If we got any A records, consider as listed
		// Capture the first response code (usually 127.0.0.x format)
		if (addrs && addrs.length > 0) {
			return { listed: true, responseCode: addrs[0] };
		}
		return { listed: false };
	} catch {
		// NXDOMAIN or SERVFAIL => treat as not listed
		return { listed: false };
	}
}

function computeReputation({
	spf,
	dmarc,
	blacklists,
}: {
	spf: SpfResult;
	dmarc: DmarcResult;
	blacklists: BlacklistResults;
}): ReputationSummary {
	let score = 100;
	const notes: string[] = [];

	const anyIpListed = Object.values(blacklists.ips).some((entries) => entries.some((e) => e.listed));
	const domainListed = blacklists.domain.some((e) => e.listed);

	if (anyIpListed) {
		score -= 40;
		notes.push('One or more MX IPs appear on DNSBLs');
	}
	if (domainListed) {
		score -= 30;
		notes.push('Domain appears on domain blacklist');
	}
	if (!spf.found || !spf.validSyntax) {
		score -= 10;
		notes.push('SPF missing or invalid');
	}
	if (!dmarc.found) {
		score -= 15;
		notes.push('DMARC missing');
	} else if (dmarc.policy === 'none') {
		score -= 8;
		notes.push('DMARC enforcement not enabled (p=none)');
	} else if (dmarc.policy === 'quarantine') {
		score -= 2;
		notes.push('DMARC partially enforced (p=quarantine)');
	}

	if (score < 0) score = 0;
	if (score > 100) score = 100;

	const level: ReputationSummary['level'] = score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor';
	return { score, level, notes };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDnsError(e: any): string {
	if (!e) return 'Unknown error';
	if (e.code) return `${e.code}${e.hostname ? ` for ${e.hostname}` : ''}`;
	if (e.message) return e.message;
	return String(e);
}

async function retryOperation<T>(op: () => Promise<T>, retries = 2, baseDelayMs = 200): Promise<T> {
	let lastErr: unknown;
	for (let i = 0; i <= retries; i++) {
		try {
			return await op();
		} catch (e) {
			lastErr = e;
			if (i === retries) break;
			const delay = baseDelayMs * Math.pow(2, i);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	throw lastErr as any;
}

async function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
	return await Promise.race<T>([
		p,
		new Promise<T>((_, rej) => setTimeout(() => rej(new Error('Timeout')), timeoutMs)),
	]);
}

async function dnsResolveTxt(name: string): Promise<string[][]> {
	return await retryOperation(() => withTimeout(dns.resolveTxt(name), TIMEOUTS.dnsMs), 2, 200);
}

async function dnsResolveMx(name: string): Promise<Awaited<ReturnType<typeof dns.resolveMx>>> {
	return await retryOperation(() => withTimeout(dns.resolveMx(name), TIMEOUTS.dnsMs), 2, 200);
}

async function dnsResolve4Safe(name: string): Promise<string[]> {
	try {
		return await retryOperation(() => withTimeout(dns.resolve4(name), TIMEOUTS.dnsMs), 2, 200);
	} catch {
		return [];
	}
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let idx = 0;
	async function worker() {
		while (true) {
			const current = idx++;
			if (current >= items.length) break;
			results[current] = await fn(items[current], current);
		}
	}
	const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
	await Promise.all(workers);
	return results;
}


