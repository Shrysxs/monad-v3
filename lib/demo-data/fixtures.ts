import { signEd25519Message } from "../crypto/ed25519";
import { canonicalizeRfc8785 } from "../crypto/canonicalize";
import { sha256Bytes, hashChunks, sha256Text } from "../crypto/hashing";
import { calculateReleaseDigest } from "../chain/contract";
import type {
  SignedReleaseManifest,
  ReleaseRecord,
  ReleaseManifestPayload,
} from "../verification/types";

// Known deterministic Demo Publisher keypair
export const DEMO_PUBLISHER = {
  publisherId: "canonical-ubuntu",
  publisherAddress: "0xCAFE000000000000000000000000000000000001" as `0x${string}`,
  publicKeyHex: "8580e9bff52d9f6cc5529540ab83c7166a8a46ec854071057e79f780c76868d4",
  privateKeyHex: "713417a9a6905ea197b3bd50c5c0920443fc822cf4e79a46844a6df11208805b",
  keyId: "ed25519-demo-key-1",
  demoOnly: true as const,
};

export const DEMO_MONAD_PUBLISHER = {
  publisherId: "org.monad.core",
  publisherAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
  publicKeyHex: "e037b5ee10f6063bb9a444a70cb6531ccfd02a5e5eb81dfb47007787b469956c",
  privateKeyHex: "1c28c89c8942b101c519280d90db3132cc08f51bb1f2b6e15967735399ecf208",
  keyId: "ed25519-monad-main",
  demoOnly: true as const,
};

export interface DemoFixtureItem {
  id: string;
  name: string;
  description: string;
  fileName: string;
  fileBytes: Uint8Array;
  manifest: SignedReleaseManifest;
  releaseRecord: ReleaseRecord;
  demoOnly: true;
}

/**
 * Builds authentic fixture bundle with valid cryptographic signatures and digests.
 */
export async function createDemoFixture(params: {
  id: string;
  name: string;
  description: string;
  publisher: typeof DEMO_PUBLISHER;
  productId: string;
  releaseVersion: string;
  fileName: string;
  rawText: string;
  chunkSize?: number;
  tamperFileByte?: boolean;
  status?: "ACTIVE" | "SUPERSEDED" | "REVOKED";
  revokeReason?: string;
}): Promise<DemoFixtureItem> {
  const originalBytes = new TextEncoder().encode(params.rawText);
  const authenticSha256 = await sha256Bytes(originalBytes);
  const { chunkHashes } = await hashChunks(originalBytes, params.chunkSize ?? 32);

  const manifestPayload: ReleaseManifestPayload = {
    schemaVersion: "1.0.0",
    publisherId: params.publisher.publisherId,
    productId: params.productId,
    releaseVersion: params.releaseVersion,
    fileName: params.fileName,
    fileSize: originalBytes.byteLength,
    sha256: authenticSha256,
    chunkSize: params.chunkSize ?? 32,
    chunkHashes,
    publisherKeyId: params.publisher.keyId,
  };

  const canonicalManifest = canonicalizeRfc8785(manifestPayload);
  const signature = signEd25519Message(canonicalManifest, params.publisher.privateKeyHex);
  const manifestDigest = await sha256Text(canonicalManifest);

  const releaseDigest = calculateReleaseDigest(
    manifestPayload.publisherId,
    manifestPayload.productId,
    manifestPayload.releaseVersion,
    `0x${authenticSha256}`,
    `0x${manifestDigest}`
  );

  const releaseRecord: ReleaseRecord = {
    releaseDigest,
    publisherAddress: params.publisher.publisherAddress,
    publisherId: params.publisher.publisherId,
    productId: params.productId,
    releaseVersion: params.releaseVersion,
    fileHash: `0x${authenticSha256}`,
    manifestDigest: `0x${manifestDigest}`,
    previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
    status: params.status ?? "ACTIVE",
    revokeReason: params.revokeReason,
    registeredAt: Date.now() - 86400000,
    blockNumber: 1042000n,
  };

  // If tamper requested, flip a byte in fileBytes
  const fileBytes = new Uint8Array(originalBytes);
  if (params.tamperFileByte) {
    fileBytes[8] = fileBytes[8] ^ 0xff;
  }

  return {
    id: params.id,
    name: params.name,
    description: params.description,
    fileName: params.fileName,
    fileBytes,
    manifest: {
      ...manifestPayload,
      signature,
    },
    releaseRecord,
    demoOnly: true,
  };
}

let cachedFixtures: DemoFixtureItem[] | null = null;

export async function getDemoFixtures(): Promise<DemoFixtureItem[]> {
  if (cachedFixtures) return cachedFixtures;

  const authentic = await createDemoFixture({
    id: "fixture-authentic-ubuntu",
    name: "Ubuntu 24.04.1 LTS (Authentic Official Release)",
    description: "Official canonical AMD64 ISO image signed by Canonical release key. Matches on-chain active status.",
    publisher: DEMO_PUBLISHER,
    productId: "ubuntu-desktop-iso",
    releaseVersion: "24.04.1",
    fileName: "ubuntu-24.04-desktop-amd64.iso",
    rawText: "Canonical Ubuntu 24.04.1 LTS (Noble Numbat) Official AMD64 Production Release Image payload bytes [AUTHENTIC_DATA_2026]",
    chunkSize: 16,
    status: "ACTIVE",
  });

  const tampered = await createDemoFixture({
    id: "fixture-tampered-ubuntu",
    name: "Ubuntu 24.04.1 LTS (1-Byte Tampered / Bit-Rot)",
    description: "Same canonical manifest and valid signature, but 1 byte in chunk #0 is modified (simulating bit-rot or payload injection).",
    publisher: DEMO_PUBLISHER,
    productId: "ubuntu-desktop-iso",
    releaseVersion: "24.04.1",
    fileName: "ubuntu-24.04-desktop-amd64.iso",
    rawText: "Canonical Ubuntu 24.04.1 LTS (Noble Numbat) Official AMD64 Production Release Image payload bytes [AUTHENTIC_DATA_2026]",
    chunkSize: 16,
    tamperFileByte: true,
    status: "ACTIVE",
  });

  const repacked = await createDemoFixture({
    id: "fixture-repacked-ubuntu",
    name: "Ubuntu 24.04.1 LTS (Unauthenticated Repack)",
    description: "Identical filename 'ubuntu-24.04-desktop-amd64.iso', but entirely different untrusted byte stream from an unverified tracker.",
    publisher: DEMO_PUBLISHER,
    productId: "ubuntu-desktop-iso",
    releaseVersion: "24.04.1",
    fileName: "ubuntu-24.04-desktop-amd64.iso",
    rawText: "UNTRUSTED_REPACK: Backdoored binary masquerading under identical filename with altered scripts and bundled telemetry.",
    chunkSize: 16,
    status: "ACTIVE",
  });

  const revoked = await createDemoFixture({
    id: "fixture-revoked-monad",
    name: "Monad Node v0.2.1 (Revoked On-Chain)",
    description: "Cryptographically authentic file and valid signature, but explicitly revoked on Monad Testnet due to critical CVE.",
    publisher: DEMO_MONAD_PUBLISHER as unknown as typeof DEMO_PUBLISHER,
    productId: "monad-node-bin",
    releaseVersion: "0.2.1",
    fileName: "monad-node-v0.2.1-linux-amd64.tar.gz",
    rawText: "Monad Validator Daemon v0.2.1 build with consensus edge-case bug [DO_NOT_RUN_REVOKED_BUILD]",
    chunkSize: 16,
    status: "REVOKED",
    revokeReason: "Critical security vulnerability in consensus gossip handler CVE-2026-9812",
  });

  const superseded = await createDemoFixture({
    id: "fixture-superseded-monad",
    name: "Monad Node v0.1.0 (Superseded Historical Version)",
    description: "Legitimate older release v0.1.0 superseded on Monad Testnet by newer active release v0.2.0.",
    publisher: DEMO_MONAD_PUBLISHER as unknown as typeof DEMO_PUBLISHER,
    productId: "monad-node-bin",
    releaseVersion: "0.1.0",
    fileName: "monad-node-v0.1.0-linux-amd64.tar.gz",
    rawText: "Monad Validator Daemon v0.1.0 historical initial release [LEGITIMATE_HISTORICAL]",
    chunkSize: 16,
    status: "SUPERSEDED",
  });

  cachedFixtures = [authentic, tampered, repacked, revoked, superseded];
  return cachedFixtures;
}
