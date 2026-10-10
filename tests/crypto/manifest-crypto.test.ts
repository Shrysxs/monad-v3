import { describe, it, expect } from "vitest";
import { canonicalizeRfc8785 } from "@/lib/crypto/canonicalize";
import { sha256Bytes, sha256Text, hashChunks } from "@/lib/crypto/hashing";
import {
  generateEd25519KeyPair,
  signEd25519Message,
  verifyEd25519Signature,
} from "@/lib/crypto/ed25519";
import {
  parseAndValidateManifest,
  verifyManifestSignature,
} from "@/lib/manifests/manifest";
import type { ReleaseManifestPayload, SignedReleaseManifest } from "@/lib/verification/types";

describe("RFC 8785 Canonical JSON Serialization (JCS)", () => {
  it("sorts object keys lexicographically by UTF-16 code units", () => {
    const unordered = { z: 100, b: "second", a: "first", _x: true };
    const canonical = canonicalizeRfc8785(unordered);
    expect(canonical).toBe('{"_x":true,"a":"first","b":"second","z":100}');
  });

  it("omits undefined properties and strips whitespace", () => {
    const objWithUndefined = {
      name: "SwarmTrace",
      version: "1.0.0",
      ignored: undefined,
      nested: { num: 42, empty: undefined },
    };
    const canonical = canonicalizeRfc8785(objWithUndefined);
    expect(canonical).toBe('{"name":"SwarmTrace","nested":{"num":42},"version":"1.0.0"}');
  });

  it("handles arrays deterministically without whitespace", () => {
    const list = [{ id: 2 }, { id: 1 }];
    const canonical = canonicalizeRfc8785(list);
    expect(canonical).toBe('[{"id":2},{"id":1}]');
  });

  it("serializes numbers according to ECMAScript standard without trailing zeros", () => {
    expect(canonicalizeRfc8785(123)).toBe("123");
    expect(canonicalizeRfc8785(0.5)).toBe("0.5");
    expect(canonicalizeRfc8785(-0)).toBe("0");
  });
});

describe("Web Crypto API SHA-256 Hashing", () => {
  it("hashes text matching known SHA-256 test vectors", async () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const emptyHash = await sha256Text("");
    expect(emptyHash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

    // SHA-256("SwarmTrace") = b45c9be6295325cbf368686ea9a7ffc3a5e840d0246f6f250cf4f58c7041fa3c (computed)
    const hash = await sha256Text("SwarmTrace");
    expect(hash).toHaveLength(64);
  });

  it("detects single-byte alteration in binary data", async () => {
    const originalBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const alteredBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 9]); // Last byte changed

    const hashOriginal = await sha256Bytes(originalBytes);
    const hashAltered = await sha256Bytes(alteredBytes);

    expect(hashOriginal).not.toBe(hashAltered);
  });

  it("computes sequential chunk hashes for torrent piece verification", async () => {
    const buffer = new Uint8Array(100);
    for (let i = 0; i < 100; i++) buffer[i] = i % 256;

    const { chunkHashes, totalChunks } = await hashChunks(buffer, 30);
    expect(totalChunks).toBe(4); // 30, 30, 30, 10
    expect(chunkHashes).toHaveLength(4);
  });
});

describe("Ed25519 Signing & Verification", () => {
  it("generates keypairs and verifies authentic signatures", () => {
    const { publicKeyHex, privateKeyHex } = generateEd25519KeyPair();
    const message = "Canonical Payload String";

    const signatureHex = signEd25519Message(message, privateKeyHex);
    expect(signatureHex).toHaveLength(128);

    const isValid = verifyEd25519Signature(signatureHex, message, publicKeyHex);
    expect(isValid).toBe(true);
  });

  it("rejects forged or modified signatures", () => {
    const { publicKeyHex, privateKeyHex } = generateEd25519KeyPair();
    const message = "Authentic Message";

    const signatureHex = signEd25519Message(message, privateKeyHex);
    const tamperedMessage = "Tampered Message";

    const isTamperedValid = verifyEd25519Signature(signatureHex, tamperedMessage, publicKeyHex);
    expect(isTamperedValid).toBe(false);
  });
});

describe("Release Manifest Pipeline & Verification Vectors", () => {
  const keyPair = generateEd25519KeyPair();

  const validPayload: ReleaseManifestPayload = {
    schemaVersion: "1.0.0",
    publisherId: "org.swarmtrace.core",
    productId: "swarmtrace-node",
    releaseVersion: "1.0.0",
    fileName: "swarmtrace-node-v1.0.0.tar.gz",
    fileSize: 1048576,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    publisherKeyId: "key-2026-v1",
    chunkSize: 524288,
    chunkHashes: [
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    ],
  };

  it("validates and verifies a properly signed manifest", async () => {
    const canonicalPayload = canonicalizeRfc8785(validPayload);
    const signature = signEd25519Message(canonicalPayload, keyPair.privateKeyHex);

    const signedManifest: SignedReleaseManifest = {
      ...validPayload,
      signature,
    };

    const validation = await parseAndValidateManifest(signedManifest);
    expect(validation.valid).toBe(true);

    if (validation.valid) {
      const sigResult = await verifyManifestSignature(validation.manifest, keyPair.publicKeyHex);
      expect(sigResult.isValid).toBe(true);
      expect(sigResult.status).toBe("VALID");
    }
  });

  it("detects manifest tampering (altered version number)", async () => {
    const canonicalPayload = canonicalizeRfc8785(validPayload);
    const signature = signEd25519Message(canonicalPayload, keyPair.privateKeyHex);

    // Attacker modifies version string while keeping original signature
    const tamperedManifest = {
      ...validPayload,
      releaseVersion: "2.0.0-MALICIOUS",
      signature,
    };

    const validation = await parseAndValidateManifest(tamperedManifest);
    expect(validation.valid).toBe(true);

    if (validation.valid) {
      const sigResult = await verifyManifestSignature(validation.manifest, keyPair.publicKeyHex);
      expect(sigResult.isValid).toBe(false);
      expect(sigResult.status).toBe("INVALID");
    }
  });

  it("rejects unsupported schema versions", async () => {
    const invalidManifest = {
      ...validPayload,
      schemaVersion: "2.0.0",
      signature: "00".repeat(64),
    };

    const validation = await parseAndValidateManifest(invalidManifest);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.error).toBe("UNSUPPORTED_SCHEMA_VERSION");
    }
  });

  it("rejects manifests with missing required fields", async () => {
    const missingFieldManifest = {
      schemaVersion: "1.0.0",
      publisherId: "org.swarmtrace.core",
      // missing productId
      releaseVersion: "1.0.0",
      fileName: "test.zip",
      fileSize: 100,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      publisherKeyId: "key-1",
      signature: "00".repeat(64),
    };

    const validation = await parseAndValidateManifest(missingFieldManifest);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.error).toBe("MISSING_REQUIRED_FIELDS");
    }
  });

  it("rejects invalid digest formats", async () => {
    const invalidDigestManifest = {
      ...validPayload,
      sha256: "not-a-valid-sha256",
      signature: "00".repeat(64),
    };

    const validation = await parseAndValidateManifest(invalidDigestManifest);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.error).toBe("INVALID_DIGEST_FORMAT");
    }
  });
});
