import { describe, it, expect } from "vitest";
import { aggregateRiskIntelligence } from "@/lib/risk/evidence";
import type {
  FileIntegrityResult,
  SignatureVerificationResult,
  ReleaseRecord,
  EvidenceFinding,
} from "@/lib/verification/types";

describe("Swarm Risk Intelligence Aggregator", () => {
  const cleanIntegrityMatch: FileIntegrityResult = {
    status: "MATCH",
    fileName: "test-package.tar.gz",
    fileSize: 1024,
    computedSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expectedSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chunksTotal: 1,
    chunksMatched: 1,
    chunkDetails: [],
    message: "Checksum match verified",
  };

  const validSignature: SignatureVerificationResult = {
    status: "VALID",
    isValid: true,
    publisherId: "org.monad.validator",
    keyId: "key-1",
    publicKeyUsed: "1111111111111111111111111111111111111111111111111111111111111111",
    canonicalPayload: "{}",
    computedManifestDigest: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    message: "Signature verified",
  };

  const activeReleaseRecord: ReleaseRecord = {
    releaseDigest: "0x1111000000000000000000000000000000000000000000000000000000000000",
    publisherAddress: "0xCAFE000000000000000000000000000000000001",
    publisherId: "org.monad.validator",
    productId: "monad-node",
    releaseVersion: "0.4.2",
    fileHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "0x2222000000000000000000000000000000000000000000000000000000000000",
    previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
    status: "ACTIVE",
    registeredAt: Date.now() - 3600000,
    blockNumber: 50000n,
  };

  it("never reports a file as malware-free when no scanner ran (SCANNER_UNAVAILABLE)", () => {
    const report = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: validSignature,
      releaseRecord: activeReleaseRecord,
      // No scanner config provided
    });

    expect(report.scannerAvailable).toBe(false);
    expect(report.assessment).toBe("AUTHENTICITY_CONFIRMED_SECURITY_UNKNOWN");
    expect(report.assessmentTitle).toContain("Authenticity Confirmed (Malware Status Unknown)");

    const scannerFinding = report.findings.find((f) => f.sourceType === "STATIC_SCANNER");
    expect(scannerFinding).toBeDefined();
    expect(scannerFinding?.status).toBe("UNAVAILABLE");
    expect(scannerFinding?.description).toContain("Unscanned files are never reported as clean");
  });

  it("never treats an integrity hash mismatch as proof of malware", () => {
    const mismatchIntegrity: FileIntegrityResult = {
      status: "MISMATCH",
      fileName: "test-package.tar.gz",
      fileSize: 1024,
      computedSha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      expectedSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      message: "Integrity mismatch",
    };

    const report = aggregateRiskIntelligence({
      fileIntegrity: mismatchIntegrity,
      signatureVerification: validSignature,
      releaseRecord: activeReleaseRecord,
    });

    expect(report.assessment).toBe("INTEGRITY_MISMATCH");
    expect(report.summary).toContain("does not prove malware");
    expect(report.summary).toContain("differ from the reference manifest");
  });

  it("immediately prioritizes on-chain REVOKED status and zeroes trust", () => {
    const revokedRecord: ReleaseRecord = {
      ...activeReleaseRecord,
      status: "REVOKED",
      revokeReason: "Compromised build pipeline key in CI incident",
    };

    const report = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: validSignature,
      releaseRecord: revokedRecord,
    });

    expect(report.assessment).toBe("REVOKED_RELEASE");
    expect(report.provenanceScore).toBe(0);
    expect(report.summary).toContain("revoked on Monad Testnet");
  });

  it("detects conflicting evidence between publisher signature and scanner warnings", () => {
    const externalMalwareFinding: EvidenceFinding = {
      id: "scanner-alert-1",
      sourceId: "virustotal-community",
      sourceType: "STATIC_SCANNER",
      title: "Trojan.Agent heuristic detection",
      description: "Heuristic signature detected executable payload in script wrapper.",
      status: "FLAGGED",
      observedAt: Date.now(),
      isStale: false,
      demoOnly: false,
    };

    const report = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: validSignature,
      releaseRecord: activeReleaseRecord,
      scannerConfig: { enabled: true, apiKey: "vt_mock_key" },
      externalFindings: [externalMalwareFinding],
    });

    expect(report.scannerAvailable).toBe(true);
    expect(report.hasConflictingFindings).toBe(true);
    expect(report.assessment).toBe("SUSPICIOUS_SECURITY_FINDING");
  });

  it("flags stale evidence when findings have passed expiration", () => {
    const staleFinding: EvidenceFinding = {
      id: "stale-scanner-1",
      sourceId: "legacy-feed",
      sourceType: "COMMUNITY_VERIFIER",
      title: "Outdated vulnerability advisory",
      description: "Advisory from 180 days ago.",
      status: "INFORMATIONAL",
      observedAt: Date.now() - 10000000,
      expiresAt: Date.now() - 1000, // Expired
      isStale: false, // Initially false, will be marked true by aggregator
      demoOnly: false,
    };

    const report = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: validSignature,
      externalFindings: [staleFinding],
    });

    expect(report.hasStaleFindings).toBe(true);
    const finding = report.findings.find((f) => f.id === "stale-scanner-1");
    expect(finding?.isStale).toBe(true);
  });

  it("calculates provenance confidence score proportionally to cryptographic and on-chain verification", () => {
    // Valid sig (40) + hash match (40) + active on-chain (20) = 100
    const fullReport = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: validSignature,
      releaseRecord: activeReleaseRecord,
    });
    expect(fullReport.provenanceScore).toBe(100);

    // Valid sig (40) + hash match (40) + no on-chain (0) = 80
    const offchainReport = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: validSignature,
    });
    expect(offchainReport.provenanceScore).toBe(80);

    // Invalid sig (0) + hash match (40) capped at 20 = 20 or less
    const unsignedReport = aggregateRiskIntelligence({
      fileIntegrity: cleanIntegrityMatch,
      signatureVerification: {
        status: "INVALID",
        isValid: false,
        publisherId: "unknown",
        keyId: "bad-key",
        publicKeyUsed: "bad",
        canonicalPayload: "{}",
        computedManifestDigest: "0x00",
        message: "Invalid signature",
      },
    });
    expect(unsignedReport.provenanceScore).toBe(40);
  });
});
