import { describe, it, expect } from "vitest";
import { generateEd25519KeyPair, signEd25519Message } from "@/lib/crypto/ed25519";
import { canonicalizeRfc8785 } from "@/lib/crypto/canonicalize";
import { sha256Bytes, hashChunks, sha256Text } from "@/lib/crypto/hashing";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { aggregateRiskIntelligence } from "@/lib/risk/evidence";
import { calculateReleaseDigest } from "@/lib/chain/contract";
import type {
  SignedReleaseManifest,
  ReleaseManifestPayload,
  ReleaseRecord,
} from "@/lib/verification/types";

describe("SwarmTrace E2E Cryptographic & Registry Verification Pipeline", () => {
  const publisherKeyPair = generateEd25519KeyPair();
  const rawFile = new TextEncoder().encode("Monad Testnet Blitz Hackathon 2026 - SwarmTrace Distribution");

  async function buildPipelineArtifacts() {
    const fileSha256 = await sha256Bytes(rawFile);
    const { chunkHashes } = await hashChunks(rawFile, 16);

    const payload: ReleaseManifestPayload = {
      schemaVersion: "1.0.0",
      publisherId: "io.monad.swarmtrace",
      productId: "swarmtrace-daemon",
      releaseVersion: "2.1.0",
      fileName: "swarmtrace-daemon-v2.1.0-linux-x64.tar.gz",
      fileSize: rawFile.byteLength,
      sha256: fileSha256,
      chunkSize: 16,
      chunkHashes,
      publisherKeyId: "ed25519-key-primary",
    };

    const canonicalJson = canonicalizeRfc8785(payload);
    const signature = signEd25519Message(canonicalJson, publisherKeyPair.privateKeyHex);
    const manifestDigest = await sha256Text(canonicalJson);

    const signedManifest: SignedReleaseManifest = {
      ...payload,
      signature,
    };

    // Calculate smart contract release digest
    const calculatedDigest = calculateReleaseDigest(
      payload.publisherId,
      payload.productId,
      payload.releaseVersion,
      `0x${fileSha256}`,
      `0x${manifestDigest}`
    );

    const onChainRecord: ReleaseRecord = {
      releaseDigest: calculatedDigest,
      publisherAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      publisherId: payload.publisherId,
      productId: payload.productId,
      releaseVersion: payload.releaseVersion,
      fileHash: `0x${fileSha256}`,
      manifestDigest: `0x${manifestDigest}`,
      previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      status: "ACTIVE",
      registeredAt: Date.now(),
      blockNumber: 1042000n,
    };

    return { signedManifest, onChainRecord, rawFile, calculatedDigest };
  }

  it("successfully passes end-to-end authentic verification with perfect provenance score", async () => {
    const { signedManifest, onChainRecord, rawFile } = await buildPipelineArtifacts();

    // 1. Run Live Swarm Integrity Engine
    const integrityVerdict = await verifyFileAgainstManifest({
      fileBytes: rawFile,
      fileName: signedManifest.fileName,
      manifest: signedManifest,
      publisherPublicKeyHex: publisherKeyPair.publicKeyHex,
      onChainRecord,
    });

    expect(integrityVerdict.status).toBe("MATCHING_AUTHENTICATED_RELEASE");
    expect(integrityVerdict.fileIntegrity.status).toBe("MATCH");
    expect(integrityVerdict.signatureVerification.isValid).toBe(true);

    // 2. Feed into Swarm Risk Intelligence Aggregator
    const riskReport = aggregateRiskIntelligence({
      fileIntegrity: integrityVerdict.fileIntegrity,
      signatureVerification: integrityVerdict.signatureVerification,
      releaseRecord: onChainRecord,
    });

    expect(riskReport.assessment).toBe("AUTHENTICITY_CONFIRMED_SECURITY_UNKNOWN");
    expect(riskReport.provenanceScore).toBe(100);
    expect(riskReport.scannerAvailable).toBe(false); // Unscanned never reported as clean
    expect(riskReport.findings.length).toBeGreaterThanOrEqual(4);
  });

  it("accurately detects localized tampering and reflects in risk report", async () => {
    const { signedManifest, onChainRecord, rawFile } = await buildPipelineArtifacts();

    // Tamper 1 byte
    const tamperedFile = new Uint8Array(rawFile);
    tamperedFile[4] = tamperedFile[4] ^ 0x01;

    const integrityVerdict = await verifyFileAgainstManifest({
      fileBytes: tamperedFile,
      fileName: signedManifest.fileName,
      manifest: signedManifest,
      publisherPublicKeyHex: publisherKeyPair.publicKeyHex,
      onChainRecord,
    });

    expect(integrityVerdict.status).toBe("HASH_MISMATCH");
    expect(integrityVerdict.fileIntegrity.status).toBe("MISMATCH");
    // Signature of the manifest is still valid, but the file doesn't match the manifest!
    expect(integrityVerdict.signatureVerification.isValid).toBe(true);

    const riskReport = aggregateRiskIntelligence({
      fileIntegrity: integrityVerdict.fileIntegrity,
      signatureVerification: integrityVerdict.signatureVerification,
      releaseRecord: onChainRecord,
    });

    expect(riskReport.assessment).toBe("INTEGRITY_MISMATCH");
    expect(riskReport.provenanceScore).toBeLessThanOrEqual(20);
    expect(riskReport.summary).toContain("does not prove malware");
  });

  it("properly flags on-chain revocation and drops provenance score to 0", async () => {
    const { signedManifest, onChainRecord, rawFile } = await buildPipelineArtifacts();

    const revokedRecord: ReleaseRecord = {
      ...onChainRecord,
      status: "REVOKED",
      revokeReason: "Vulnerability in dependency chain: CVE-2026-4412",
      revokedAt: Date.now(),
    };

    const integrityVerdict = await verifyFileAgainstManifest({
      fileBytes: rawFile,
      fileName: signedManifest.fileName,
      manifest: signedManifest,
      publisherPublicKeyHex: publisherKeyPair.publicKeyHex,
      onChainRecord: revokedRecord,
    });

    expect(integrityVerdict.status).toBe("REVOKED_RELEASE");

    const riskReport = aggregateRiskIntelligence({
      fileIntegrity: integrityVerdict.fileIntegrity,
      signatureVerification: integrityVerdict.signatureVerification,
      releaseRecord: revokedRecord,
    });

    expect(riskReport.assessment).toBe("REVOKED_RELEASE");
    expect(riskReport.provenanceScore).toBe(0);
  });

  it("calculates deterministic release digest matching Solidity abi.encode exactly", () => {
    const pId = "org.swarmtrace.core";
    const prodId = "swarmtrace-client";
    const ver = "1.2.0";
    const fHash = "0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a" as `0x${string}`;
    const mDigest = "0x8fae8f81a70295da9be68d90faea2050b44cb72e73708bb04cf93f415c138d61" as `0x${string}`;

    const digest = calculateReleaseDigest(pId, prodId, ver, fHash, mDigest);

    // Verified against Foundry SwarmTraceRegistry.calculateReleaseDigest
    expect(digest).toBe("0xa7bbd0212bb7cab8c33e162899c24b0f017076ce2cb35bda5f884af20e982e39");
  });
});
