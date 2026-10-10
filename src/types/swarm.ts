export type VerificationStatus =
  | 'idle'
  | 'calculating'
  | 'matching'
  | 'mismatch'
  | 'unknown'
  | 'revoked'
  | 'error';

export type ScannerStatus =
  | 'NOT_SCANNED'
  | 'SCANNER_UNAVAILABLE'
  | 'CLEAN'
  | 'SUSPICIOUS'
  | 'MALICIOUS';

export type AuthenticityStatus =
  | 'VERIFIED_PUBLISHER'
  | 'TAMPERED_HASH'
  | 'UNREGISTERED'
  | 'REVOKED_CERTIFICATE'
  | 'UNKNOWN';

export interface VerifiedRelease {
  id: string;
  name: string;
  version: string;
  tag: string;
  fileName: string;
  fileSize: number; // in bytes
  sha256: string;
  publisher: {
    name: string;
    address: string;
    verifiedOnMonad: boolean;
    signingKeyId: string;
  };
  releaseDate: string;
  channel: 'stable' | 'beta' | 'nightly' | 'security-patch';
  monadContract: string;
  monadBlockNumber: number;
  revoked?: {
    isRevoked: boolean;
    reason?: string;
    revokedAt?: string;
    advisoryId?: string;
  };
  reproducibleBuild: {
    attested: boolean;
    buildEnvironment: string;
    builderImageSha: string;
  };
  cveAdvisories: string[];
  isDemoRecord: boolean;
}

export interface VerificationResult {
  fileName: string;
  fileSize: number;
  mimeType: string;
  lastModified: number;
  computedSha256: string;
  durationMs: number;
  status: VerificationStatus;
  authenticity: AuthenticityStatus;
  scannerStatus: ScannerStatus;
  scannerNotice: string;
  matchedRelease?: VerifiedRelease;
  detectedDiscrepancies?: string[];
  errorMessage?: string;
}

export interface ArtifactComparison {
  artifactA: VerifiedRelease;
  artifactB: VerifiedRelease;
  hashMatch: boolean;
  sizeDeltaBytes: number;
  changesSummary: string[];
}

export interface RiskEvidenceItem {
  id: string;
  source: string;
  category: 'PUBLISHER_ATTESTATION' | 'CONSENSUS_ORACLE' | 'STATIC_ANALYSIS' | 'DYNAMIC_SANDBOX' | 'CVE_DATABASE';
  type: string;
  timestamp: string;
  status: 'PASS' | 'WARNING' | 'REVOKED' | 'NOT_SCANNED' | 'UNAVAILABLE';
  freshness: string;
  details: string;
  verifier: string;
  isDemoEvidence: boolean;
}
