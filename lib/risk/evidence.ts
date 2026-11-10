import type {
  EvidenceFinding,
  EvidenceFindingStatus,
  ReleaseRecord,
  TrustAnchorSource,
  FileIntegrityResult,
  SignatureVerificationResult,
} from "../verification/types";

export type RiskIntelligenceAssessment =
  | "AUTHENTICITY_CONFIRMED_SECURITY_UNKNOWN" // Publisher verified, but no active scanner ran
  | "INTEGRITY_MISMATCH"                      // Modified bytes
  | "REVOKED_RELEASE"                         // Revoked on-chain
  | "SUSPICIOUS_SECURITY_FINDING"             // Scanner detected threat
  | "CONFLICTING_EVIDENCE"                    // Disagreeing evidence sources
  | "UNKNOWN_PROVENANCE";                     // Unregistered / unverifiable

export interface ScannerAdapterConfig {
  apiKey?: string;
  apiUrl?: string;
  enabled?: boolean;
}

export interface RiskIntelligenceReport {
  assessment: RiskIntelligenceAssessment;
  assessmentTitle: string;
  summary: string;
  findings: EvidenceFinding[];
  scannerAvailable: boolean;
  hasStaleFindings: boolean;
  hasConflictingFindings: boolean;
  provenanceScore: number; // 0 to 100 based strictly on verified on-chain / crypto checks
  explanationSteps: string[];
}

/**
 * Aggregates all available evidence from publisher signatures, Monad registry,
 * external scanner adapters, and community verifiers into an honest risk report.
 */
export function aggregateRiskIntelligence(params: {
  fileIntegrity: FileIntegrityResult;
  signatureVerification: SignatureVerificationResult;
  releaseRecord?: ReleaseRecord | null;
  scannerConfig?: ScannerAdapterConfig;
  externalFindings?: EvidenceFinding[];
  /** Where publisher keys / release records came from; demo data is labelled as such */
  trustSource?: TrustAnchorSource;
}): RiskIntelligenceReport {
  const { fileIntegrity, signatureVerification, releaseRecord, scannerConfig, externalFindings } =
    params;
  const isDemo = params.trustSource === "DEMO_FIXTURE";
  const registryName = isDemo ? "Demo Registry (local fixtures)" : "Monad Testnet Registry";
  const registrySourceId = isDemo ? "demo-registry" : "monad-testnet-10143";

  const findings: EvidenceFinding[] = [];
  const explanationSteps: string[] = [];
  const now = Date.now();

  // 1. Publisher Signature Evidence
  // A missing registry key means the signature could not be checked at all: that is
  // absent evidence (UNAVAILABLE), not a failed check (FLAGGED).
  const sigUnchecked = signatureVerification.status === "KEY_NOT_FOUND";
  const sigStatus: EvidenceFindingStatus = signatureVerification.isValid
    ? "POSITIVE"
    : sigUnchecked
    ? "UNAVAILABLE"
    : "FLAGGED";
  findings.push({
    id: "finding-publisher-sig",
    sourceId: signatureVerification.publisherId || "unknown-publisher",
    sourceType: "PUBLISHER",
    title: "Publisher Ed25519 Cryptographic Signature",
    description: signatureVerification.isValid
      ? `Valid Ed25519 signature verified for "${signatureVerification.publisherId}" against its registered key${isDemo ? " (demo registry)" : ""}. Authorship confirmed.`
      : sigUnchecked
      ? `Publisher "${signatureVerification.publisherId}" is not registered, so no trusted key exists to check the signature against.`
      : signatureVerification.message,
    status: sigStatus,
    observedAt: now,
    isStale: false,
    demoOnly: isDemo,
  });

  explanationSteps.push(
    signatureVerification.isValid
      ? "Publisher authorship verified cryptographically via Ed25519."
      : sigUnchecked
      ? "Publisher is not registered; authorship could not be verified."
      : "Publisher signature is invalid, altered, or not trusted."
  );

  // 2. File Integrity Evidence
  const isHashMatch = fileIntegrity.status === "MATCH";
  findings.push({
    id: "finding-file-integrity",
    sourceId: "local-webcrypto",
    sourceType: "LOCAL_ENGINE",
    title: "Whole-File SHA-256 Checksum",
    description: isHashMatch
      ? "File bytes exactly match the publisher's signed release manifest."
      : `File bytes differ from the reference manifest (${fileIntegrity.computedSha256.slice(0, 10)}... != ${fileIntegrity.expectedSha256?.slice(0, 10)}...).`,
    status: isHashMatch ? "POSITIVE" : "FLAGGED",
    observedAt: now,
    isStale: false,
    demoOnly: false,
  });

  explanationSteps.push(
    isHashMatch
      ? "File SHA-256 checksum matches reference manifest."
      : "File SHA-256 checksum does not match reference manifest."
  );

  // 3. Monad Testnet On-Chain Registry Evidence
  if (releaseRecord && releaseRecord.status !== "UNKNOWN") {
    const regStatus: EvidenceFindingStatus =
      releaseRecord.status === "ACTIVE"
        ? "POSITIVE"
        : releaseRecord.status === "REVOKED"
        ? "FLAGGED"
        : "INFORMATIONAL";

    findings.push({
      id: "finding-onchain-registry",
      sourceId: registrySourceId,
      sourceType: "ONCHAIN_REGISTRY",
      title: `${registryName} Release Record`,
      description: `Registry status is ${releaseRecord.status}.${
        releaseRecord.blockNumber !== undefined ? ` Registered at block ${releaseRecord.blockNumber}.` : ""
      }${releaseRecord.revokeReason ? ` Revocation reason: "${releaseRecord.revokeReason}".` : ""}`,
      status: regStatus,
      observedAt: releaseRecord.registeredAt || now,
      isStale: false,
      demoOnly: isDemo,
    });

    explanationSteps.push(
      `${registryName} record verified: release is currently ${releaseRecord.status}.`
    );
  } else {
    findings.push({
      id: "finding-onchain-registry-missing",
      sourceId: registrySourceId,
      sourceType: "ONCHAIN_REGISTRY",
      title: `${registryName} Release Record`,
      description: `No release commitment found for this manifest in the ${registryName}.`,
      status: "UNAVAILABLE",
      observedAt: now,
      isStale: false,
      demoOnly: isDemo,
    });

    explanationSteps.push(`No commitment found in the ${registryName}.`);
  }

  // 4. Scanner Adapter Status (Honesty Rule: Never fake clean when no scanner ran)
  const isScannerConfigured = !!(scannerConfig?.enabled && scannerConfig?.apiKey);
  const hasScannerResult = (externalFindings ?? []).some(
    (f) => f.sourceType === "STATIC_SCANNER" || f.sourceType === "DYNAMIC_SANDBOX"
  );
  if (isScannerConfigured && !hasScannerResult) {
    findings.push({
      id: "finding-scanner-status",
      sourceId: "security-scanner-adapter",
      sourceType: "STATIC_SCANNER",
      title: "Malware Scanner Integration",
      description: "A scanner is configured but returned no result for this file. Malware status remains unknown.",
      status: "UNAVAILABLE",
      observedAt: now,
      isStale: false,
      demoOnly: false,
    });
    explanationSteps.push("Scanner configured but produced no result. Malware status remains unknown.");
  }
  if (!isScannerConfigured) {
    findings.push({
      id: "finding-scanner-status",
      sourceId: "security-scanner-adapter",
      sourceType: "STATIC_SCANNER",
      title: "Malware Scanner Integration",
      description:
        "No external malware scanner API is configured. Unscanned files are never reported as clean.",
      status: "UNAVAILABLE",
      observedAt: now,
      isStale: false,
      demoOnly: false,
    });

    explanationSteps.push(
      "External scanner unavailable. Malware status remains unknown per honesty policy."
    );
  }

  // 5. External findings if provided
  if (externalFindings && externalFindings.length > 0) {
    for (const ef of externalFindings) {
      const isStale = !!(ef.expiresAt && ef.expiresAt < now);
      findings.push({
        ...ef,
        isStale,
      });
    }
  }

  // 6. Check for Stale and Conflicting Findings
  const hasStaleFindings = findings.some((f) => f.isStale);
  const positiveSources = findings.filter((f) => f.status === "POSITIVE");
  const flaggedSources = findings.filter((f) => f.status === "FLAGGED");
  const hasConflictingFindings = positiveSources.length > 0 && flaggedSources.length > 0;

  // 7. Calculate Provenance Confidence Score (0 - 100)
  let provenanceScore = 0;
  if (signatureVerification.isValid) provenanceScore += 40;
  if (isHashMatch) provenanceScore += 40;
  if (releaseRecord?.status === "ACTIVE") provenanceScore += 20;
  if (releaseRecord?.status === "REVOKED") provenanceScore = 0; // Revocation zeroes trust
  if (!isHashMatch) provenanceScore = Math.min(provenanceScore, 20);

  // 8. Synthesize Overall Assessment
  let assessment: RiskIntelligenceAssessment;
  let assessmentTitle: string;
  let summary: string;

  if (releaseRecord?.status === "REVOKED") {
    assessment = "REVOKED_RELEASE";
    assessmentTitle = "Revoked Release";
    summary = "This release has been revoked on Monad Testnet by the publisher due to known defects or compromise.";
  } else if (!isHashMatch) {
    assessment = "INTEGRITY_MISMATCH";
    assessmentTitle = "Integrity Mismatch";
    summary = "The local file contents differ from the reference manifest. This confirms alteration, but does not prove malware.";
  } else if (flaggedSources.some((f) => f.sourceType === "STATIC_SCANNER" || f.sourceType === "DYNAMIC_SANDBOX")) {
    assessment = "SUSPICIOUS_SECURITY_FINDING";
    assessmentTitle = "Security Scanner Warning";
    summary = "One or more external scanners flagged potential suspicious indicators in this artifact.";
  } else if (hasConflictingFindings) {
    assessment = "CONFLICTING_EVIDENCE";
    assessmentTitle = "Conflicting Evidence";
    summary = "Findings from different sources conflict (e.g. valid publisher signature but integrity or scanner flags).";
  } else if (signatureVerification.isValid && isHashMatch && releaseRecord?.status === "ACTIVE") {
    // Authenticity requires all three: trusted signature, matching bytes, and an active registry commitment.
    assessment = "AUTHENTICITY_CONFIRMED_SECURITY_UNKNOWN";
    assessmentTitle = "Authenticity Confirmed (Malware Status Unknown)";
    summary = "The file matches the publisher's signed release exactly. Because no third-party malware scanner was executed, malware status remains unknown.";
  } else if (signatureVerification.isValid && isHashMatch && releaseRecord?.status === "SUPERSEDED") {
    assessment = "UNKNOWN_PROVENANCE";
    assessmentTitle = "Authentic but Superseded";
    summary = "The file matches an authentic release, but the publisher has superseded it with a newer version.";
  } else if (signatureVerification.isValid && isHashMatch) {
    assessment = "UNKNOWN_PROVENANCE";
    assessmentTitle = "Signed but Not Registered";
    summary = "The manifest signature is valid and the file matches it, but the release is not registered on Monad, so it cannot be checked for revocation.";
  } else {
    assessment = "UNKNOWN_PROVENANCE";
    assessmentTitle = "Unknown Provenance";
    summary = "Insufficient authenticated reference data exists on Monad or in local manifests to verify this artifact.";
  }

  return {
    assessment,
    assessmentTitle,
    summary,
    findings,
    scannerAvailable: isScannerConfigured,
    hasStaleFindings,
    hasConflictingFindings,
    provenanceScore,
    explanationSteps,
  };
}
