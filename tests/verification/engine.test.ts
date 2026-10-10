import { describe, it, expect } from "vitest";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { generateEd25519KeyPair, signEd25519Message } from "@/lib/crypto/ed25519";
import { canonicalizeRfc8785 } from "@/lib/crypto/canonicalize";
import { sha256Bytes, hashChunks, sha256Text } from "@/lib/crypto/hashing";
import type {
  SignedReleaseManifest,
  ReleaseManifestPayload,
  ReleaseRecord,
} from "@/lib/verification/types";

describe("Live Swarm Integrity Verification Engine", () => {
  const keyPair = generateEd25519KeyPair();
  const testFileBytes = new TextEncoder().encode("Hello SwarmTrace Monad Testnet!");

  async function createSignedManifest(bytes: Uint8Array): Promise<{
    manifest: SignedReleaseManifest;
    manifestDigest: string;
  }> {
    const fileSha256 = await sha256Bytes(bytes);
    const { chunkHashes } = await hashChunks(bytes, 16);

    const payload: ReleaseManifestPayload = {
      schemaVersion: "1.0.0",
      publisherId: "org.swarmtrace.core",
      productId: "swarmtrace-client",
      releaseVersion: "1.0.0",
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      fileSize: bytes.byteLength,
      sha256: fileSha256,
      chunkSize: 16,
      chunkHashes,
      publisherKeyId: "key-1",
    };

    const canonical = canonicalizeRfc8785(payload);
    const signature = signEd25519Message(canonical, keyPair.privateKeyHex);
    const manifestDigest = await sha256Text(canonical);

    return {
      manifest: {
        ...payload,
        signature,
      },
      manifestDigest,
    };
  }

  it("verifies authentic file with active on-chain record as MATCHING_AUTHENTICATED_RELEASE", async () => {
    const { manifest, manifestDigest } = await createSignedManifest(testFileBytes);
    const activeRecord: ReleaseRecord = {
      releaseDigest: "0x1111111111111111111111111111111111111111111111111111111111111111",
      publisherAddress: "0xCAFE000000000000000000000000000000000001",
      publisherId: "org.swarmtrace.core",
      productId: "swarmtrace-client",
      releaseVersion: "1.0.0",
      fileHash: ("0x" + manifest.sha256) as `0x${string}`,
      manifestDigest: ("0x" + manifestDigest) as `0x${string}`,
      previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      status: "ACTIVE",
      registeredAt: Date.now(),
      blockNumber: 123456n,
    };

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
      onChainRecord: activeRecord,
    });

    expect(verdict.status).toBe("MATCHING_AUTHENTICATED_RELEASE");
    expect(verdict.fileIntegrity.status).toBe("MATCH");
    expect(verdict.signatureVerification.isValid).toBe(true);
    expect(verdict.fileIntegrity.chunkDetails).toBeDefined();
    expect(verdict.fileIntegrity.chunksMatched).toBe(verdict.fileIntegrity.chunksTotal);
    expect(verdict.caveats.length).toBeGreaterThan(0);
  });

  it("detects single byte modification as HASH_MISMATCH with chunk breakdown", async () => {
    const { manifest } = await createSignedManifest(testFileBytes);

    // Modify 1 byte in the file
    const tamperedBytes = new Uint8Array(testFileBytes);
    tamperedBytes[0] = tamperedBytes[0] ^ 0xff;

    const verdict = await verifyFileAgainstManifest({
      fileBytes: tamperedBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
    });

    expect(verdict.status).toBe("HASH_MISMATCH");
    expect(verdict.fileIntegrity.status).toBe("MISMATCH");
    expect(verdict.fileIntegrity.chunksMatched).toBeLessThan(verdict.fileIntegrity.chunksTotal!);
    // Check first chunk is marked MISMATCH
    expect(verdict.fileIntegrity.chunkDetails![0].status).toBe("MISMATCH");
  });

  it("detects forged or altered manifest as INVALID_MANIFEST_SIGNATURE", async () => {
    const { manifest } = await createSignedManifest(testFileBytes);
    // Attacker modifies manifest version
    manifest.releaseVersion = "9.9.9-INJECTED";

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
    });

    expect(verdict.status).toBe("INVALID_MANIFEST_SIGNATURE");
    expect(verdict.signatureVerification.isValid).toBe(false);
  });

  it("identifies revoked release as REVOKED_RELEASE regardless of matching bytes", async () => {
    const { manifest, manifestDigest } = await createSignedManifest(testFileBytes);
    const revokedRecord: ReleaseRecord = {
      releaseDigest: "0x1111111111111111111111111111111111111111111111111111111111111111",
      publisherAddress: "0xCAFE000000000000000000000000000000000001",
      publisherId: "org.swarmtrace.core",
      productId: "swarmtrace-client",
      releaseVersion: "1.0.0",
      fileHash: ("0x" + manifest.sha256) as `0x${string}`,
      manifestDigest: ("0x" + manifestDigest) as `0x${string}`,
      previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      status: "REVOKED",
      registeredAt: Date.now() - 10000,
      revokedAt: Date.now(),
      revokeReason: "Vulnerability CVE-2026-9999",
      blockNumber: 123456n,
    };

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
      onChainRecord: revokedRecord,
    });

    expect(verdict.status).toBe("REVOKED_RELEASE");
    expect(verdict.fileIntegrity.status).toBe("MATCH");
    expect(verdict.signatureVerification.isValid).toBe(true);
  });

  it("rejects on-chain record if fileHash does not match manifest (binding attack defense)", async () => {
    const { manifest, manifestDigest } = await createSignedManifest(testFileBytes);
    // Attacker crafts record claiming status ACTIVE, but for a different fileHash
    const spoofedRecord: ReleaseRecord = {
      releaseDigest: "0x1111111111111111111111111111111111111111111111111111111111111111",
      publisherAddress: "0xCAFE000000000000000000000000000000000001",
      publisherId: "org.swarmtrace.core",
      productId: "swarmtrace-client",
      releaseVersion: "1.0.0",
      fileHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", // Mismatched!
      manifestDigest: ("0x" + manifestDigest) as `0x${string}`,
      previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      status: "ACTIVE",
      registeredAt: Date.now(),
      blockNumber: 123456n,
    };

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
      onChainRecord: spoofedRecord,
    });

    // Must not trust the mismatched on-chain status
    expect(verdict.status).toBe("UNKNOWN_RELEASE");
    expect(verdict.explanations.some((e) => e.includes("cryptographic tuple mismatch"))).toBe(true);
  });

  it("rejects on-chain record if publisherId does not match manifest (cross-publisher defense)", async () => {
    const { manifest, manifestDigest } = await createSignedManifest(testFileBytes);
    const spoofedRecord: ReleaseRecord = {
      releaseDigest: "0x1111111111111111111111111111111111111111111111111111111111111111",
      publisherAddress: "0xCAFE000000000000000000000000000000000001",
      publisherId: "attacker.rogue.org", // Mismatched publisher!
      productId: "swarmtrace-client",
      releaseVersion: "1.0.0",
      fileHash: ("0x" + manifest.sha256) as `0x${string}`,
      manifestDigest: ("0x" + manifestDigest) as `0x${string}`,
      previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      status: "ACTIVE",
      registeredAt: Date.now(),
      blockNumber: 123456n,
    };

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
      onChainRecord: spoofedRecord,
    });

    expect(verdict.status).toBe("UNKNOWN_RELEASE");
    expect(verdict.explanations.some((e) => e.includes("cryptographic tuple mismatch"))).toBe(true);
  });

  it("flags KEY_UNAUTHORIZED when manifest signing key does not match authorized publisher key", async () => {
    const { manifest } = await createSignedManifest(testFileBytes);
    const otherKeyPair = generateEd25519KeyPair();

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
      authorizedPublisherPubKeyHex: otherKeyPair.publicKeyHex, // Different authorized key on Monad!
    });

    expect(verdict.status).toBe("UNAUTHORIZED_KEY");
    expect(verdict.signatureVerification.isValid).toBe(false);
    expect(verdict.signatureVerification.status).toBe("KEY_UNAUTHORIZED");
  });

  it("explicitly returns NETWORK_ERROR when RPC communication fails", async () => {
    const { manifest } = await createSignedManifest(testFileBytes);

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
      networkError: "Connection refused to https://testnet-rpc.monad.xyz",
    });

    expect(verdict.status).toBe("NETWORK_ERROR");
    expect(verdict.summary).toContain("Network error communicating with Monad Testnet");
  });

  it("skips chunk verification when manifest chunk metadata is incomplete or inconsistent", async () => {
    const { manifest } = await createSignedManifest(testFileBytes);
    // Incomplete chunk metadata: file is 31 bytes, chunkSize is 16, so expected 2 chunks, but only 1 provided
    manifest.chunkHashes = ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"];

    const verdict = await verifyFileAgainstManifest({
      fileBytes: testFileBytes,
      fileName: "swarmtrace-client-v1.0.0.tar.gz",
      manifest,
      publisherPublicKeyHex: keyPair.publicKeyHex,
    });

    // Chunk details must not be verified because metadata was incomplete
    expect(verdict.fileIntegrity.chunkDetails).toBeUndefined();
    expect(
      verdict.explanations.some((e) =>
        e.includes("Chunk verification skipped: Manifest chunk metadata is incomplete")
      )
    ).toBe(true);
  });
});

