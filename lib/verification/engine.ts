import { sha256Bytes } from "../crypto/hashing";
import { verifyManifestSignature } from "../manifests/manifest";
import type {
  SignedReleaseManifest,
  ReleaseRecord,
  VerificationVerdict,
  FileIntegrityResult,
  ChunkIntegrityResult,
  OverallVerdictStatus,
  EvidenceFinding,
} from "./types";

export interface VerifyFileOptions {
  fileBytes: Uint8Array;
  fileName: string;
  manifest: SignedReleaseManifest;
  publisherPublicKeyHex: string;
  onChainRecord?: ReleaseRecord | null;
  authorizedPublisherPubKeyHex?: string | null;
  networkError?: string | null;
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
    publisherPublicKeyHex,
    onChainRecord,
    authorizedPublisherPubKeyHex,
    networkError,
  } = options;

  const explanations: string[] = [];
  const caveats: string[] = [
    "A matching cryptographic hash establishes byte-level equivalence to the publisher reference; it does not prove the file is malware-free.",
    "A hash mismatch proves the file differs from the reference artifact; it does not automatically indicate malicious intent.",
    "A filename is an informational display label and is never proof of publisher identity.",
  ];

  // 1. Verify Manifest Signature
  const signatureResult = await verifyManifestSignature(manifest, publisherPublicKeyHex);

  // Cross-check publisher key authorization against Monad registry binding
  if (signatureResult.isValid && authorizedPublisherPubKeyHex) {
    const normAuthorized = authorizedPublisherPubKeyHex.toLowerCase().replace(/^0x/, "");
    const normUsed = publisherPublicKeyHex.toLowerCase().replace(/^0x/, "");
    if (normAuthorized !== normUsed) {
      signatureResult.isValid = false;
      signatureResult.status = "KEY_UNAUTHORIZED";
      signatureResult.message = `The key used to verify the manifest (${normUsed.slice(0, 10)}...) is not the authorized signing key registered on Monad (${normAuthorized.slice(0, 10)}...).`;
    }
  }

  if (!signatureResult.isValid) {
    explanations.push(
      signatureResult.status === "KEY_UNAUTHORIZED"
        ? signatureResult.message
        : `Manifest signature verification failed against publisher key (${publisherPublicKeyHex.slice(0, 10)}...). The manifest is invalid or was altered.`
    );
  } else {
    explanations.push(
      `Manifest signature is valid and authentic for publisher "${manifest.publisherId}" using key "${manifest.publisherKeyId}".`
    );
  }

  // 2. Compute Whole-File SHA-256
  const computedSha256 = await sha256Bytes(fileBytes);
  const expectedSha256 = manifest.sha256.toLowerCase();
  const isHashMatch = computedSha256 === expectedSha256;

  // 3. Piece/Chunk Verification ONLY when manifest provides valid and complete chunk metadata
  let chunkDetails: ChunkIntegrityResult[] | undefined;
  let chunksMatched = 0;
  let chunksTotal = 0;

  const hasChunkMeta =
    typeof manifest.chunkSize === "number" &&
    manifest.chunkSize > 0 &&
    Array.isArray(manifest.chunkHashes) &&
    manifest.chunkHashes.length > 0;

  const expectedChunkCount =
    manifest.chunkSize && manifest.chunkSize > 0
      ? fileBytes.byteLength === 0
        ? 0
        : Math.ceil(fileBytes.byteLength / manifest.chunkSize)
      : -1;

  const isChunkMetaComplete =
    hasChunkMeta &&
    manifest.chunkHashes!.length === expectedChunkCount &&
    manifest.chunkHashes!.every(
      (h) => typeof h === "string" && /^[0-9a-fA-F]{64}$/.test(h.replace(/^0x/, ""))
    );

  if (hasChunkMeta && !isChunkMetaComplete) {
    explanations.push(
      `Chunk verification skipped: Manifest chunk metadata is incomplete or inconsistent with file size (${manifest.chunkHashes?.length ?? 0} chunk hashes provided, expected ${expectedChunkCount}).`
    );
  } else if (isChunkMetaComplete && manifest.chunkSize) {
    chunksTotal = manifest.chunkHashes!.length;
    chunkDetails = [];
    const chunkSize = manifest.chunkSize;

    for (let i = 0; i < chunksTotal; i++) {
      const byteStart = i * chunkSize;
      const byteEnd = Math.min(byteStart + chunkSize, fileBytes.byteLength);
      const pieceSlice = fileBytes.subarray(byteStart, byteEnd);
      const pieceHash = await sha256Bytes(pieceSlice);
      const expectedPieceHash = manifest.chunkHashes![i].toLowerCase().replace(/^0x/, "");

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
  }

  const fileIntegrity: FileIntegrityResult = {
    status: isHashMatch ? "MATCH" : "MISMATCH",
    fileName,
    fileSize: fileBytes.byteLength,
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

  // 4. On-chain Record Evaluation & Strict Cryptographic Binding Check
  let onChainStatus: "ACTIVE" | "SUPERSEDED" | "REVOKED" | "UNKNOWN" = "UNKNOWN";
  if (onChainRecord) {
    const normRecordFileHash = onChainRecord.fileHash.toLowerCase().replace(/^0x/, "");
    const normManifestFileHash = manifest.sha256.toLowerCase().replace(/^0x/, "");
    const isFileHashBound = normRecordFileHash === normManifestFileHash;

    const isPublisherBound = onChainRecord.publisherId === manifest.publisherId;
    const isProductBound = onChainRecord.productId === manifest.productId;
    const isVersionBound = onChainRecord.releaseVersion === manifest.releaseVersion;

    const normRecordManifestDigest = onChainRecord.manifestDigest.toLowerCase().replace(/^0x/, "");
    const normComputedManifestDigest = signatureResult.computedManifestDigest.toLowerCase().replace(/^0x/, "");
    const isManifestDigestBound =
      !normRecordManifestDigest ||
      normRecordManifestDigest === "0000000000000000000000000000000000000000000000000000000000000000" ||
      normRecordManifestDigest === normComputedManifestDigest;

    const isCryptographicallyBound =
      isFileHashBound && isPublisherBound && isProductBound && isVersionBound && isManifestDigestBound;

    if (!isCryptographicallyBound) {
      onChainStatus = "UNKNOWN";
      explanations.push(
        `Security alert: On-chain release record rejected due to cryptographic tuple mismatch (${
          !isFileHashBound
            ? "fileHash differs from manifest"
            : !isPublisherBound
            ? "publisherId mismatch"
            : !isManifestDigestBound
            ? "manifestDigest mismatch"
            : "productId/version mismatch"
        }).`
      );
    } else {
      onChainStatus = onChainRecord.status;
      explanations.push(
        `On-chain release record verified on Monad Testnet: Status is ${onChainStatus}.`
      );
      if (onChainStatus === "REVOKED") {
        explanations.push(
          `WARNING: Release was revoked on-chain by the publisher. Reason: "${onChainRecord.revokeReason || "No reason specified"}".`
        );
      }
    }
  } else if (!networkError) {
    explanations.push("No corresponding release commitment was found on Monad Testnet.");
  }

  // 5. Synthesize Overall Verdict Status
  let overallStatus: OverallVerdictStatus;
  let summary: string;

  if (networkError) {
    overallStatus = "NETWORK_ERROR";
    summary = `Network error communicating with Monad Testnet: ${networkError}. On-chain verification could not be completed.`;
    explanations.push(`Network communication error: ${networkError}`);
  } else if (signatureResult.status === "KEY_UNAUTHORIZED") {
    overallStatus = "UNAUTHORIZED_KEY";
    summary = "The key used to verify the manifest is not authorized for this publisher on Monad Testnet.";
  } else if (!signatureResult.isValid) {
    overallStatus = "INVALID_MANIFEST_SIGNATURE";
    summary = "Manifest signature is invalid. The release manifest cannot be authenticated.";
  } else if (!isHashMatch) {
    overallStatus = "HASH_MISMATCH";
    summary = "The local file contents do not match the publisher-signed manifest.";
  } else if (onChainStatus === "REVOKED") {
    overallStatus = "REVOKED_RELEASE";
    summary = "File matches manifest, but this release has been explicitly revoked on Monad.";
  } else if (onChainStatus === "SUPERSEDED") {
    overallStatus = "SUPERSEDED_RELEASE";
    summary = "File matches manifest, but this release has been superseded by a newer version.";
  } else if (onChainStatus === "ACTIVE") {
    overallStatus = "MATCHING_AUTHENTICATED_RELEASE";
    summary = "File matches an authentic, active publisher release registered on Monad Testnet.";
  } else {
    // Valid signature and hash match, but no record found on-chain
    overallStatus = "UNKNOWN_RELEASE";
    summary = "Manifest is signed, but no active release record was verified on Monad Testnet.";
  }

  // Initial evidence findings
  const findings: EvidenceFinding[] = [
    {
      id: "ev-publisher-sig",
      sourceId: manifest.publisherId,
      sourceType: "PUBLISHER",
      title: "Publisher Ed25519 Signature",
      description: signatureResult.message,
      status: signatureResult.isValid ? "POSITIVE" : "FLAGGED",
      observedAt: Date.now(),
      isStale: false,
      demoOnly: false,
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
      sourceId: "monad-testnet-registry",
      sourceType: "ONCHAIN_REGISTRY",
      title: "Monad Release Status",
      description: onChainRecord
        ? `Status: ${onChainStatus} (Registered at block ${onChainRecord.blockNumber ?? "latest"})`
        : "No release commitment found on Monad Testnet registry.",
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
      demoOnly: false,
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
    releaseRecord: onChainRecord ?? undefined,
    findings,
    explanations,
    caveats,
  };
}
