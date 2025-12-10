export type DnsIssueSeverity = 'info' | 'warning' | 'error';

export interface DnsIssue {
	summary: string;
	detail?: string;
	severity: DnsIssueSeverity;
}

export interface MxRecordInfo {
	exchange: string;
	priority: number;
	addresses?: string[];
	geo?: Array<{
		ip: string;
		country?: string;
		countryCode?: string;
		region?: string;
		city?: string;
		org?: string;
		asn?: string;
		latitude?: number;
		longitude?: number;
	}>;
}

export interface SpfResult {
	found: boolean;
	record?: string;
	validSyntax: boolean;
	issues: DnsIssue[];
	mechanisms?: string[];
	allMechanism?: string;
}

export interface DmarcResult {
	found: boolean;
	record?: string;
	validSyntax: boolean;
	policy?: 'none' | 'quarantine' | 'reject';
	subdomainPolicy?: 'none' | 'quarantine' | 'reject';
	pct?: number;
	rua?: string[];
	ruf?: string[];
	alignment?: {
		adkim?: 'r' | 's';
		aspf?: 'r' | 's';
	};
	issues: DnsIssue[];
}

export interface DkimResult {
	checked: boolean;
	selector?: string;
	found: boolean;
	record?: string;
	keyType?: 'rsa' | 'ed25519' | 'unknown';
	keyLengthBits?: number;
	issues: DnsIssue[];
}

export interface BimiResult {
	found: boolean;
	selector: string;
	record?: string;
	logoUrl?: string;
	authority?: string;
	validSvg?: boolean;
	issues: DnsIssue[];
}

export interface MtastsPolicy {
	version?: 'STSv1';
	mode?: 'enforce' | 'testing' | 'none';
	maxAge?: number;
	mx?: string[];
	raw?: string;
}

export interface MtastsResult {
	foundTxt: boolean;
	id?: string;
	foundPolicy: boolean;
	policy?: MtastsPolicy;
	issues: DnsIssue[];
}

export interface TlsRptResult {
	found: boolean;
	record?: string;
	rua?: string[];
	issues: DnsIssue[];
}

export interface DkimDiscoveryResult {
	selectorsTried: string[];
	found: Array<{
		selector: string;
		record: string;
	}>;
	issues: DnsIssue[];
}

export interface DnsblListing {
	list: string;
	type: 'ip' | 'domain';
	listed: boolean;
	responseCode?: string; // e.g., "127.0.0.2" for Spamhaus SBL
	message?: string;
}

export interface BlacklistResults {
	domain: DnsblListing[];
	ips: Record<string, DnsblListing[]>;
	issues: DnsIssue[];
}

export interface ReputationSummary {
	score: number; // 0..100
	level: 'good' | 'fair' | 'poor';
	notes: string[];
}

export interface DmarcSimulationInput {
	headerFrom: string;
	envelopeFrom: string;
	assumedDkimDomain?: string;
}

export interface DmarcScenarioOutcome {
	policy: 'none' | 'quarantine' | 'reject';
	adkim: 'r' | 's';
	aspf: 'r' | 's';
	alignedPass: boolean;
	passBy: 'dkim' | 'spf' | 'none';
	disposition: 'none' | 'quarantine' | 'reject';
	notes: string[];
}

export interface SimulationResults {
	input: DmarcSimulationInput;
	scenarios: DmarcScenarioOutcome[];
}

export interface StarttlsCheck {
	host: string;
	ip?: string;
	mxPref?: number;
	answer?: string;
	connectOk: boolean;
	heloOk?: boolean;
	starttlsSupported?: boolean;
	tlsEstablished?: boolean;
	tlsProtocol?: string;
	cipher?: string;
	certSubjectCN?: string;
	certAuthorized?: boolean;
	certValidFrom?: string;
	certValidTo?: string;
	secureOk?: boolean;
	mailFromOk?: boolean;
	mtastsOk?: boolean;
	daneOk?: boolean | 'not tested';
	timings?: {
		connectMs?: number;
		heloMs?: number;
		starttlsOfferMs?: number;
		tlsHandshakeMs?: number;
		mailFromMs?: number;
	};
	transcript?: string[];
	score?: number;
	issues: DnsIssue[];
}

export interface DomainAnalysis {
	domain: string;
	mx: {
		found: boolean;
		records: MxRecordInfo[];
		issues: DnsIssue[];
	};
	spf: SpfResult;
	dmarc: DmarcResult;
	dkim: DkimResult;
	bimi: BimiResult;
	mtasts: MtastsResult;
	tlsrpt: TlsRptResult;
	dkimDiscovery: DkimDiscoveryResult;
	blacklists: BlacklistResults;
	reputation: ReputationSummary;
	simulations: SimulationResults;
	starttls: {
		checks: StarttlsCheck[];
		issues: DnsIssue[];
	};
	meta: {
		queryTimestamp: string;
		apiVersion: string;
		timings?: Record<string, number>;
	};
}


