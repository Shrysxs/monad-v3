import { hashSource, type FileDigest } from "../crypto/stream-hash";
import { canonicalizeRfc8785 } from "../crypto/canonicalize";
import { computeManifestDigest, verifyManifestSignature } from "../manifests/manifest";
import type {
  SignedReleaseManifest,
  ReleaseRecord,
  RegistryPublisher,
  TrustAnchorSource,
  VerificationVerdict,
  FileIntegrityResult,
  ChunkIntegrityResult,
  OverallVerdictStatus,
  EvidenceFinding,
  SignatureVerificationResult,
} from "./types";

export interface VerifyFileOptions {
  /** File contents held in memory (fixtures, tests). Provide this or `fileDigest`. */
  fileBytes?: Uint8Array;
  /**
   * Digest computed elsewhere, e.g. streamed in a Web Worker via `hashFile`, so large files
   * never need to be loaded into memory. Piece hashes must use the manifest's chunkSize.
   */
  fileDigest?: FileDigest;
  fileName: string;
  manifest: SignedReleaseManifest;
  /**
   * Publisher entry from the registry (on-chain, or the demo registry in demo mode).
   * This is the ONLY source of the verification key. `null`/`undefined` means the
   * publisher is not registered, so the signature cannot be tied to a trusted key.
   */
  publisher?: RegistryPublisher | null;
  /** Release record looked up by the exact release digest of this manifest. */
  onChainRecord?: ReleaseRecord | null;
  networkError?: string | null;
  /** Where `publisher` / `onChainRecord` came from. Defaults to MONAD_TESTNET. */
  trustSource?: TrustAnchorSource;
}

const strip0x = (hex: string) => hex.toLowerCase().replace(/^0x/, "");
const shortKey = (hex: string) => `${strip0x(hex).slice(0, 10)}...`;

/**
 * Checks that an on-chain record commits to exactly this manifest and publisher.
 * Returns null when bound, or a human-readable reason when it must be rejected.
 */
function checkRecordBinding(
  record: ReleaseRecord,
  manifest: SignedReleaseManifest,
  manifestDigestHex: string,
  publisher: RegistryPublisher | null | undefined
): string | null {
  if (strip0x(record.fileHash) !== strip0x(manifest.sha256)) return "fileHash differs from manifest";
  if (record.publisherId !== manifest.publisherId) return "publisherId mismatch";
  if (record.productId !== manifest.productId || record.releaseVersion !== manifest.releaseVersion) {
    return "productId/version mismatch";
  }
  if (strip0x(record.manifestDigest) !== strip0x(manifestDigestHex)) return "manifestDigest mismatch";
  if (publisher && record.publisherAddress.toLowerCase() !== publisher.publisherAddress.toLowerCase()) {
    return "record was not registered by this publisher's account";
  }
  return null;
}

export interface AuthenticateManifestOptions {
  manifest: SignedReleaseManifest;
  publisher?: RegistryPublisher | null;
  onChainRecord?: ReleaseRecord | null;
  trustSource?: TrustAnchorSource;
}

export interface ManifestAuthentication {
  signatureResult: SignatureVerificationResult;
  /** Record that commits to exactly this manifest and publisher, or null */
  boundRecord: ReleaseRecord | null;
  /** Hex SHA-256 of the canonical manifest payload (no 0x) */
  manifestDigestHex: string;
  explanations: string[];
}

/**
 * Authenticates a signed manifest against registry trust anchors, without needing the file.
 *
 * Shared by every page (verify, risk, release DNA) so trust decisions are made in one place:
 *  1. computes the canonical manifest digest
 *  2. binds the on-chain record to this exact manifest and publisher account
 *  3. picks the verification key from the registry (release key, else current key)
 *     and checks the signature; unregistered or deauthorized publishers are never trusted.
 */
export async function authenticateManifest(
  options: AuthenticateManifestOptions
): Promise<ManifestAuthentication> {
  const { manifest, publisher, onChainRecord, trustSource = "MONAD_TESTNET" } = options;
  const registryLabel = trustSource === "DEMO_FIXTURE" ? "the demo registry" : "Monad Testnet";
  const explanations: string[] = [];

  // 1. Canonical manifest digest (needed to bind the on-chain record before choosing a key)
  const { signature: _sig, ...payload } = manifest;
  void _sig;
  const canonicalPayload = canonicalizeRfc8785(payload);
  const manifestDigestHex = strip0x(await computeManifestDigest(manifest));

  // 2. Bind the on-chain record to this exact manifest + publisher
  let boundRecord: ReleaseRecord | null = null;
  if (onChainRecord) {
    const rejection = checkRecordBinding(onChainRecord, manifest, manifestDigestHex, publisher);
    if (rejection) {
      explanations.push(
        `Security alert: release record rejected due to cryptographic tuple mismatch (${rejection}).`
      );
    } else {
      boundRecord = onChainRecord;
    }
  }

  // 3. Resolve the trusted signing key from the registry and verify the signature
  const unverified = (
    status: SignatureVerificationResult["status"],
    message: string
  ): SignatureVerificationResult => ({
    status,
    isValid: false,
    publisherId: manifest.publisherId,
    keyId: manifest.publisherKeyId,
    publicKeyUsed: "",
    canonicalPayload,
    computedManifestDigest: manifestDigestHex,
    message,
  });

  let signatureResult: SignatureVerificationResult;
  if (!publisher) {
    signatureResult = unverified(
      "KEY_NOT_FOUND",
      `Publisher "${manifest.publisherId}" is not registered in ${registryLabel}. Without a registered key the manifest signature cannot be authenticated.`
    );
  } else if (!publisher.isAuthorized) {
    signatureResult = unverified(
      "KEY_REVOKED",
      `Publisher "${manifest.publisherId}" has been deauthorized in ${registryLabel}. Its signing keys are no longer trusted.`
    );
  } else {
    // A registered release is verified against the key that was authorized when it was
    // registered, so rotating keys does not invalidate earlier releases. Unregistered
    // releases can only be checked against the publisher's current key.
    const releaseKey = boundRecord?.signingKey;
    const keyHex = releaseKey ?? publisher.ed25519PubKey;
    const keyLabel = releaseKey
      ? "the signing key registered with this release"
      : "the publisher's current registered key";
    signatureResult = await verifyManifestSignature(manifest, strip0x(keyHex));
    signatureResult.message = signatureResult.isValid
      ? `Manifest signature verified against ${keyLabel} (${shortKey(keyHex)}).`
      : `Manifest signature does not verify against ${keyLabel} (${shortKey(keyHex)}). The manifest was altered or signed by an unauthorized key.`;
  }
  explanations.push(signatureResult.message);

  return { signatureResult, boundRecord, manifestDigestHex, explanations };
}

/**
 * Executes full client-side file and manifest verification.
 */
export async function verifyFileAgainstManifest(
  options: VerifyFileOptions
): Promise<VerificationVerdict> {
  const {
    fileBytes,
    fileName,
    manifest,
    publisher,
    onChainRecord,
    networkError,
    trustSource = "MONAD_TESTNET",
  } = options;
  const manifestChunkSize =
    typeof manifest.chunkSize === "number" && Number.isSafeInteger(manifest.chunkSize) && manifest.chunkSize > 0
      ? manifest.chunkSize
      : undefined;
  let fileDigest = options.fileDigest;
  if (!fileDigest) {
    if (!fileBytes) throw new Error("verifyFileAgainstManifest requires fileBytes or fileDigest");
    fileDigest = await hashSource(fileBytes, { chunkSize: manifestChunkSize });
  }
  const fileSizeActual = fileDigest.size;
  const isDemo = trustSource === "DEMO_FIXTURE";
  const registryLabel = isDemo ? "the demo registry" : "Monad Testnet";

  const explanations: string[] = [];
  const caveats: string[] = [
    "A matching cryptographic hash establishes byte-level equivalence to the publisher reference; it does not prove the file is malware-free.",
    "A hash mismatch proves the file differs from the reference artifact; it does not automatically indicate malicious intent.",
    "A filename is an informational display label and is never proof of publisher identity.",
  ];
  if (isDemo) {
    caveats.push("Publisher keys and release records in this result come from local demo fixtures, not from Monad Testnet.");
  }

  // 1-3. Authenticate the manifest (record binding + registry key + signature)
  const auth = await authenticateManifest({ manifest, publisher, onChainRecord, trustSource });
  const { signatureResult, boundRecord } = auth;
  explanations.push(...auth.explanations);

  // 4. Whole-file SHA-256
  const computedSha256 = fileDigest.sha256.toLowerCase();
  const expectedSha256 = strip0x(manifest.sha256);
  const isHashMatch = computedSha256 === expectedSha256;

  // Declared size vs actual size (a size difference alone proves the bytes differ)
  const isSizeMatch = manifest.fileSize === fileSizeActual;
  if (!isSizeMatch) {
    explanations.push(
      `File size is ${fileSizeActual} bytes, but the manifest declares ${manifest.fileSize} bytes (${
        fileSizeActual > manifest.fileSize ? "+" : ""
      }${fileSizeActual - manifest.fileSize} bytes).`
    );
  }

  // 5. Piece verification, only when the manifest provides complete piece metadata.
  //    Piece layout follows the size the publisher declared, so pieces can still be
  //    compared (and missing/extra bytes localized) when the local file changed length.
  let chunkDetails: ChunkIntegrityResult[] | undefined;
  let chunksMatched = 0;
  let chunksTotal = 0;

  const hasChunkMeta =
    manifestChunkSize !== undefined && Array.isArray(manifest.chunkHashes) && manifest.chunkHashes.length > 0;
  const expectedChunkCount = manifestChunkSize
    ? manifest.fileSize === 0
      ? 0
      : Math.ceil(manifest.fileSize / manifestChunkSize)
    : -1;
  const isChunkMetaComplete =
    hasChunkMeta &&
    manifest.chunkHashes!.length === expectedChunkCount &&
    manifest.chunkHashes!.every((h) => typeof h === "string" && /^[0-9a-f]{64}$/.test(strip0x(h)));

  if (hasChunkMeta && !isChunkMetaComplete) {
    explanations.push(
      `Chunk verification skipped: Manifest chunk metadata is incomplete or inconsistent with the declared file size (${manifest.chunkHashes?.length ?? 0} chunk hashes provided, expected ${expectedChunkCount}).`
    );
  } else if (isChunkMetaComplete && manifestChunkSize) {
    if (fileDigest.chunkSize !== manifestChunkSize || !fileDigest.chunkHashes) {
      explanations.push("Chunk verification skipped: local piece hashes were not computed with the manifest's chunk size.");
    } else {
      chunksTotal = manifest.chunkHashes!.length;
      chunkDetails = [];
      for (let i = 0; i < chunksTotal; i++) {
        const byteStart = i * manifestChunkSize;
        const byteEnd = Math.min(byteStart + manifestChunkSize, manifest.fileSize);
        // A piece missing locally (file shorter than declared) never matches.
        const pieceHash = fileDigest.chunkHashes[i] ?? "";
        const expectedPieceHash = strip0x(manifest.chunkHashes![i]);
        const pieceMatch = pieceHash === expectedPieceHash;
        if (pieceMatch) chunksMatched++;
        chunkDetails.push({
          chunkIndex: i,
          byteStart,
          byteEnd,
          computedSha256: pieceHash,
          expectedSha256: expectedPieceHash,
          status: pieceMatch ? "MATCH" : "MISMATCH",
        });
      }
      explanations.push(
        `Chunk verification: ${chunksMatched} of ${chunksTotal} pieces match the publisher manifest.`
      );
      if (fileSizeActual > manifest.fileSize) {
        explanations.push(
          `${fileSizeActual - manifest.fileSize} trailing bytes beyond the declared size are not covered by any manifest piece.`
        );
      }
    }
  }

  const fileIntegrity: FileIntegrityResult = {
    status: isHashMatch ? "MATCH" : "MISMATCH",
    fileName,
    fileSize: fileSizeActual,
    expectedFileSize: manifest.fileSize,
    computedSha256,
    expectedSha256,
    chunksTotal: chunksTotal > 0 ? chunksTotal : undefined,
    chunksMatched: chunksTotal > 0 ? chunksMatched : undefined,
    chunkDetails,
    message: isHashMatch
      ? "Whole-file SHA-256 hash matches the publisher-signed manifest exactly."
      : `Whole-file SHA-256 hash (${computedSha256.slice(0, 12)}...) differs from manifest reference (${expectedSha256.slice(0, 12)}...).`,
  };

  if (isHashMatch) {
    explanations.push("Computed whole-file SHA-256 matches the manifest digest byte-for-byte.");
  } else {
    explanations.push("Computed whole-file SHA-256 differs from expected manifest reference.");
  }

  // 6. On-chain release status (only from a record bound to this manifest)
  const onChainStatus: "ACTIVE" | "SUPERSEDED" | "REVOKED" | "UNKNOWN" = boundRecord
    ? boundRecord.status
    : "UNKNOWN";
  if (boundRecord) {
    explanations.push(`Release record verified in ${registryLabel}: status is ${onChainStatus}.`);
    if (onChainStatus === "REVOKED") {
      explanations.push(
        `WARNING: Release was revoked by the publisher. Reason: "${boundRecord.revokeReason || "No reason specified"}".`
      );
    }
  } else if (!onChainRecord && !networkError) {
    explanations.push(`No release commitment for this exact manifest was found in ${registryLabel}.`);
  }

  // 7. Synthesize Overall Verdict Status
  let overallStatus: OverallVerdictStatus;
  let summary: string;

  // Order matters: anything proven locally (an invalid signature, altered bytes) is
  // reported before registry availability, so an RPC outage never hides tampering.
  if (networkError) {
    explanations.push(`Network communication error: ${networkError}`);
  }

  if (signatureResult.status === "KEY_REVOKED" || signatureResult.status === "KEY_UNAUTHORIZED") {
    overallStatus = "UNAUTHORIZED_KEY";
    summary = `Publisher "${manifest.publisherId}" is not currently authorized in ${registryLabel}; its signatures are not trusted.`;
  } else if (signatureResult.status === "INVALID" || signatureResult.status === "ERROR") {
    overallStatus = "INVALID_MANIFEST_SIGNATURE";
    summary = "Manifest signature is invalid. The release manifest cannot be authenticated.";
  } else if (!isHashMatch || !isSizeMatch) {
    overallStatus = "HASH_MISMATCH";
    summary = networkError
      ? "The local file contents do not match the manifest. (The registry was unreachable, so the manifest itself could not be authenticated either.)"
      : "The local file contents do not match the publisher-signed manifest.";
  } else if (networkError) {
    overallStatus = "NETWORK_ERROR";
    summary = `Network error communicating with Monad Testnet: ${networkError}. The file matches the manifest, but the publisher key and release status could not be verified.`;
  } else if (signatureResult.status === "KEY_NOT_FOUND") {
    overallStatus = "UNKNOWN_RELEASE";
    summary = `Publisher "${manifest.publisherId}" is not registered in ${registryLabel}, so this manifest cannot be authenticated.`;
  } else if (onChainStatus === "REVOKED") {
    overallStatus = "REVOKED_RELEASE";
    summary = "File matches manifest, but this release has been explicitly revoked on Monad.";
  } else if (onChainStatus === "SUPERSEDED") {
    overallStatus = "SUPERSEDED_RELEASE";
    summary = "File matches manifest, but this release has been superseded by a newer version.";
  } else if (onChainStatus === "ACTIVE") {
    overallStatus = "MATCHING_AUTHENTICATED_RELEASE";
    summary = `File matches an authentic, active publisher release registered in ${registryLabel}.`;
  } else {
    // Valid signature and hash match, but no record found on-chain
    overallStatus = "UNKNOWN_RELEASE";
    summary = `Manifest signature is valid, but this release is not registered in ${registryLabel}.`;
  }

  // Initial evidence findings
  const findings: EvidenceFinding[] = [
    {
      id: "ev-publisher-sig",
      sourceId: manifest.publisherId,
      sourceType: "PUBLISHER",
      title: "Publisher Ed25519 Signature",
      description: signatureResult.message,
      status: signatureResult.isValid
        ? "POSITIVE"
        : signatureResult.status === "KEY_NOT_FOUND"
        ? "UNAVAILABLE"
        : "FLAGGED",
      observedAt: Date.now(),
      isStale: false,
      demoOnly: isDemo,
    },
    {
      id: "ev-integrity-sha256",
      sourceId: "local-crypto-engine",
      sourceType: "LOCAL_ENGINE",
      title: "Whole-File SHA-256 Digest",
      description: fileIntegrity.message,
      status: isHashMatch ? "POSITIVE" : "FLAGGED",
      observedAt: Date.now(),
      isStale: false,
      demoOnly: false,
    },
    {
      id: "ev-monad-registry",
      sourceId: isDemo ? "demo-registry" : "monad-testnet-registry",
      sourceType: "ONCHAIN_REGISTRY",
      title: isDemo ? "Demo Registry Release Status" : "Monad Release Status",
      description: boundRecord
        ? `Status: ${onChainStatus}${boundRecord.blockNumber !== undefined ? ` (registered at block ${boundRecord.blockNumber})` : ""}${isDemo ? " [demo registry]" : ""}`
        : `No release commitment for this manifest found in ${registryLabel}.`,
      status:
        onChainStatus === "ACTIVE"
          ? "POSITIVE"
          : onChainStatus === "REVOKED"
          ? "FLAGGED"
          : onChainStatus === "SUPERSEDED"
          ? "INFORMATIONAL"
          : "UNAVAILABLE",
      observedAt: Date.now(),
      isStale: false,
      demoOnly: isDemo,
    },
    {
      id: "ev-security-scanner",
      sourceId: "scanner-adapter",
      sourceType: "STATIC_SCANNER",
      title: "Malware Scanner Integration",
      description: "No external malware scanner configured. Unscanned status is never shown as clean.",
      status: "NOT_SCANNED",
      observedAt: Date.now(),
      isStale: false,
      demoOnly: false,
    },
  ];

  return {
    status: overallStatus,
    summary,
    fileIntegrity,
    signatureVerification: signatureResult,
    releaseRecord: boundRecord ?? undefined,
    trustSource,
    findings,
    explanations,
    caveats,
  };
}
