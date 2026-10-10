import { canonicalizeRfc8785 } from "../crypto/canonicalize";
import { sha256Text } from "../crypto/hashing";
import { verifyEd25519Signature, normalizeHex } from "../crypto/ed25519";
import type {
  SignedReleaseManifest,
  ReleaseManifestPayload,
  ManifestValidationResult,
  SignatureVerificationResult,
} from "../verification/types";

/**
 * Validates the raw JSON or object representation of a release manifest.
 */
export async function parseAndValidateManifest(
  rawInput: string | unknown
): Promise<ManifestValidationResult> {
  let parsed: Record<string, unknown>;

  if (typeof rawInput === "string") {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        valid: false,
        error: "MALFORMED_JSON",
        message: `Failed to parse manifest JSON: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  } else {
    parsed = rawInput as Record<string, unknown>;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      error: "SCHEMA_VALIDATION_FAILED",
      message: "Manifest root must be a JSON object",
    };
  }

  // Schema version validation
  if (parsed.schemaVersion !== "1.0.0") {
    return {
      valid: false,
      error: "UNSUPPORTED_SCHEMA_VERSION",
      message: `Unsupported manifest schemaVersion: "${parsed.schemaVersion}". Expected "1.0.0".`,
    };
  }

  // Required string fields
  const requiredFields = [
    "publisherId",
    "productId",
    "releaseVersion",
    "fileName",
    "sha256",
    "publisherKeyId",
    "signature",
  ] as const;

  for (const field of requiredFields) {
    if (typeof parsed[field] !== "string" || (parsed[field] as string).trim() === "") {
      return {
        valid: false,
        error: "MISSING_REQUIRED_FIELDS",
        message: `Missing or invalid required string field: "${field}"`,
      };
    }
  }

  // File size validation
  if (typeof parsed.fileSize !== "number" || !Number.isInteger(parsed.fileSize) || parsed.fileSize < 0) {
    return {
      valid: false,
      error: "SCHEMA_VALIDATION_FAILED",
      message: "fileSize must be a non-negative integer",
    };
  }

  // Digest format validation (64-char hex)
  const sha256Hex = normalizeHex(parsed.sha256 as string);
  if (!/^[0-9a-f]{64}$/.test(sha256Hex)) {
    return {
      valid: false,
      error: "INVALID_DIGEST_FORMAT",
      message: `Invalid sha256 digest format: "${parsed.sha256}". Expected 64-character hex string.`,
    };
  }

  // Signature format validation (128-char hex for 64-byte Ed25519)
  const sigHex = normalizeHex(parsed.signature as string);
  if (!/^[0-9a-f]{128}$/.test(sigHex)) {
    return {
      valid: false,
      error: "INVALID_SIGNATURE_FORMAT",
      message: `Invalid signature format: length ${sigHex.length}. Expected 128-character hex Ed25519 signature.`,
    };
  }

  // Optional chunk validation
  if (parsed.chunkSize !== undefined) {
    if (typeof parsed.chunkSize !== "number" || parsed.chunkSize <= 0) {
      return {
        valid: false,
        error: "SCHEMA_VALIDATION_FAILED",
        message: "chunkSize must be a positive integer if provided",
      };
    }
  }

  if (parsed.chunkHashes !== undefined) {
    if (!Array.isArray(parsed.chunkHashes)) {
      return {
        valid: false,
        error: "SCHEMA_VALIDATION_FAILED",
        message: "chunkHashes must be an array of strings if provided",
      };
    }
    for (let i = 0; i < parsed.chunkHashes.length; i++) {
      const h = normalizeHex(parsed.chunkHashes[i]);
      if (!/^[0-9a-f]{64}$/.test(h)) {
        return {
          valid: false,
          error: "INVALID_DIGEST_FORMAT",
          message: `Invalid chunk digest at index ${i}: "${parsed.chunkHashes[i]}"`,
        };
      }
    }
  }

  // Extract signed envelope vs detached payload
  const { signature, ...payloadRest } = parsed;

  const payload: ReleaseManifestPayload = {
    schemaVersion: "1.0.0",
    publisherId: payloadRest.publisherId as string,
    productId: payloadRest.productId as string,
    releaseVersion: payloadRest.releaseVersion as string,
    fileName: payloadRest.fileName as string,
    fileSize: payloadRest.fileSize as number,
    sha256: sha256Hex,
    publisherKeyId: payloadRest.publisherKeyId as string,
    ...(payloadRest.chunkSize !== undefined ? { chunkSize: payloadRest.chunkSize as number } : {}),
    ...(payloadRest.chunkHashes !== undefined ? { chunkHashes: payloadRest.chunkHashes as string[] } : {}),
    ...(payloadRest.merkleRoot !== undefined ? { merkleRoot: payloadRest.merkleRoot as string } : {}),
    ...(payloadRest.releaseNotesUrl !== undefined ? { releaseNotesUrl: payloadRest.releaseNotesUrl as string } : {}),
    ...(payloadRest.previousReleaseDigest !== undefined
      ? { previousReleaseDigest: payloadRest.previousReleaseDigest as `0x${string}` }
      : {}),
  };

  const manifest: SignedReleaseManifest = {
    ...payload,
    signature: sigHex,
  };

  const canonicalJson = canonicalizeRfc8785(payload);
  const manifestDigest = await sha256Text(canonicalJson);

  return {
    valid: true,
    manifest,
    payload,
    manifestDigest,
  };
}

/**
 * Verifies the Ed25519 signature of a signed manifest against a publisher public key.
 */
export async function verifyManifestSignature(
  manifest: SignedReleaseManifest,
  publisherPublicKeyHex: string
): Promise<SignatureVerificationResult> {
  const { signature, ...payload } = manifest;

  try {
    const canonicalPayload = canonicalizeRfc8785(payload);
    const computedManifestDigest = await sha256Text(canonicalPayload);

    const isValid = verifyEd25519Signature(
      signature,
      canonicalPayload,
      publisherPublicKeyHex
    );

    return {
      status: isValid ? "VALID" : "INVALID",
      isValid,
      publisherId: manifest.publisherId,
      keyId: manifest.publisherKeyId,
      publicKeyUsed: publisherPublicKeyHex,
      canonicalPayload,
      computedManifestDigest,
      message: isValid
        ? "Manifest signature successfully verified against authorized publisher public key"
        : "Manifest signature verification failed. The manifest payload may have been altered or forged.",
    };
  } catch (err) {
    return {
      status: "ERROR",
      isValid: false,
      publisherId: manifest.publisherId,
      keyId: manifest.publisherKeyId,
      publicKeyUsed: publisherPublicKeyHex,
      canonicalPayload: "",
      computedManifestDigest: "",
      message: `Cryptographic verification error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
