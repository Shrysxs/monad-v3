/**
 * SwarmTrace — Unified Shared Data Types (Source of Truth)
 * Phase 1 Architecture Freeze
 *
 * All agents (Agent A, Agent B, Agent C) must import types from this file.
 * Do not redefine or create parallel competing type definitions.
 */

// ============================================================================
// 1. Publisher Identity & Keys
// ============================================================================

export interface PublisherIdentity {
  /** Canonical reverse-DNS identifier (e.g. "org.swarmtrace.core") */
  publisherId: string;
  /** Human-readable display name */
  displayName: string;
  /** Ethereum account address authorized on Monad */
  publisherAddress: `0x${string}`;
  /** Hex-encoded 32-byte Ed25519 public key */
  ed25519PublicKey: `0x${string}`;
  /** Key version identifier (e.g. "key-2026-v1") */
  keyId: string;
  /** Whether publisher authorization is active on Monad */
  isAuthorized: boolean;
  /** Timestamp when publisher was authorized (UNIX ms) */
  authorizedAt: number;
}

// ============================================================================
// 2. Canonical Release Manifest & Envelope
// ============================================================================

/**
 * Manifest payload subject to RFC 8785 canonical serialization and Ed25519 signing.
 * Notice: This payload strictly excludes the `signature` field to prevent recursive signing.
 */
export interface ReleaseManifestPayload {
  /** Schema specification version (e.g. "1.0.0") */
  schemaVersion: "1.0.0";
  /** Publisher identifier matching on-chain record */
  publisherId: string;
  /** Product/software identifier (e.g. "swarmtrace-client") */
  productId: string;
  /** Semantic version string (e.g. "1.2.0") */
  releaseVersion: string;
  /** Display filename hint (Informational only — NEVER proof of identity) */
  fileName: string;
  /** Total byte size of the artifact */
  fileSize: number;
  /** Hex-encoded whole-file SHA-256 digest */
  sha256: string;
  /** Optional piece size in bytes (for chunked/torrent verification) */
  chunkSize?: number;
  /** Optional array of hex-encoded SHA-256 hashes for each sequential chunk */
  chunkHashes?: string[];
  /** Optional Merkle root over chunk hashes */
  merkleRoot?: string;
  /** Key ID of the publisher key used to sign */
  publisherKeyId: string;
  /** Optional URL to release notes or changelog */
  releaseNotesUrl?: string;
  /** Optional previous release digest for version lineage */
  previousReleaseDigest?: `0x${string}`;
}

/**
 * Complete signed manifest envelope including detached Ed25519 signature.
 */
export interface SignedReleaseManifest extends ReleaseManifestPayload {
  /** Hex-encoded 64-byte Ed25519 signature over canonical RFC 8785 payload bytes */
  signature: string;
}

export type ManifestValidationResult =
  | {
      valid: true;
      manifest: SignedReleaseManifest;
      payload: ReleaseManifestPayload;
      manifestDigest: string;
    }
  | {
      valid: false;
      error:
        | "MALFORMED_JSON"
        | "SCHEMA_VALIDATION_FAILED"
        | "UNSUPPORTED_SCHEMA_VERSION"
        | "MISSING_REQUIRED_FIELDS"
        | "INVALID_DIGEST_FORMAT"
        | "INVALID_SIGNATURE_FORMAT";
      message: string;
    };

// ============================================================================
// 3. Release Lifecycle & On-Chain Registry Types
// ============================================================================

export type ReleaseLifecycleStatus =
  | "UNKNOWN"    // Release not found in registry
  | "ACTIVE"     // Authorized, active current release
  | "SUPERSEDED" // Legitimate older version superseded by an update
  | "REVOKED";   // Explicitly revoked due to vulnerability, compromise, or error

export interface ReleaseRecord {
  /** keccak256 commitment of (publisherId, productId, releaseVersion, fileHash, manifestDigest) */
  releaseDigest: `0x${string}`;
  /** Ethereum address of the publisher who registered this */
  publisherAddress: `0x${string}`;
  /** Publisher identifier */
  publisherId: string;
  /** Product identifier */
  productId: string;
  /** Version string */
  releaseVersion: string;
  /** SHA-256 of the artifact formatted as bytes32 */
  fileHash: `0x${string}`;
  /** SHA-256 of canonical RFC 8785 manifest payload as bytes32 */
  manifestDigest: `0x${string}`;
  /** Predecessor release digest or 0x000... */
  previousReleaseDigest: `0x${string}`;
  /** On-chain status */
  status: ReleaseLifecycleStatus;
  /** Registration timestamp (UNIX ms) */
  registeredAt: number;
  /** Revocation timestamp (UNIX ms), 0 if not revoked */
  revokedAt?: number;
  /** Revocation explanation if status == REVOKED */
  revokeReason?: string;
  /** Monad transaction hash of registration */
  transactionHash?: `0x${string}`;
  /** Monad block number */
  blockNumber?: bigint;
}

// ============================================================================
// 4. File Integrity & Chunk Verification
// ============================================================================

export type FileIntegrityStatus = "MATCH" | "MISMATCH" | "ERROR";

export interface ChunkIntegrityResult {
  chunkIndex: number;
  byteStart: number;
  byteEnd: number;
  computedSha256: string;
  expectedSha256: string;
  status: "MATCH" | "MISMATCH";
}

export interface FileIntegrityResult {
  status: FileIntegrityStatus;
  fileName: string;
  fileSize: number;
  computedSha256: string;
  expectedSha256?: string;
  chunksTotal?: number;
  chunksMatched?: number;
  chunkDetails?: ChunkIntegrityResult[];
  message: string;
}

// ============================================================================
// 5. Signature Verification Results
// ============================================================================

export type SignatureVerificationStatus =
  | "VALID"
  | "INVALID"
  | "KEY_UNAUTHORIZED"
  | "KEY_REVOKED"
  | "KEY_NOT_FOUND"
  | "ERROR";

export interface SignatureVerificationResult {
  status: SignatureVerificationStatus;
  isValid: boolean;
  publisherId: string;
  keyId: string;
  publicKeyUsed: string;
  canonicalPayload: string;
  computedManifestDigest: string;
  message: string;
}

// ============================================================================
// 6. Security Risk Evidence & Scanner Status
// ============================================================================

export type EvidenceSourceType =
  | "PUBLISHER"
  | "ONCHAIN_REGISTRY"
  | "STATIC_SCANNER"
  | "DYNAMIC_SANDBOX"
  | "COMMUNITY_VERIFIER"
  | "LOCAL_ENGINE";

export type EvidenceFindingStatus =
  | "POSITIVE"      // Finding confirms authenticity or clean check
  | "FLAGGED"       // Suspicious or malicious indicator
  | "UNAVAILABLE"   // Scanner/verifier could not be contacted
  | "NOT_SCANNED"   // No scanner configured (NEVER equate with clean)
  | "STALE"         // Result expired or outdated
  | "CONFLICTING"   // Multiple sources disagree
  | "INFORMATIONAL"; // Contextual finding (e.g. license, compiler version)

export interface EvidenceFinding {
  id: string;
  sourceId: string;
  sourceType: EvidenceSourceType;
  title: string;
  description: string;
  status: EvidenceFindingStatus;
  observedAt: number;
  expiresAt?: number;
  isStale: boolean;
  reportDigest?: string;
  reportUrl?: string;
  /** Explicitly true for simulated demo fixtures, false for verified observations */
  demoOnly: boolean;
}

// ============================================================================
// 7. Overall Evidence-Based Verdict
// ============================================================================

export type OverallVerdictStatus =
  | "MATCHING_AUTHENTICATED_RELEASE"  // Signature valid, hash matches, onchain status Active
  | "HASH_MISMATCH"                   // Manifest valid, but file bytes differ from reference
  | "INVALID_MANIFEST_SIGNATURE"      // Manifest signature check failed
  | "UNAUTHORIZED_KEY"                // Key used is not authorized for this publisher on-chain
  | "REVOKED_RELEASE"                 // File matches, but on-chain release is revoked
  | "SUPERSEDED_RELEASE"              // File matches, but on-chain release is superseded
  | "UNKNOWN_RELEASE"                 // No authenticated release reference found
  | "SECURITY_FLAGGED"                // Authentic, but scanner evidence raised active threats
  | "CONFLICTING_EVIDENCE"            // Discrepancy between publishers or verifiers
  | "NETWORK_ERROR"                   // Network or RPC communication failure
  | "VERIFICATION_ERROR";             // Runtime or parse failure

export interface VerificationVerdict {
  status: OverallVerdictStatus;
  summary: string;
  fileIntegrity: FileIntegrityResult;
  signatureVerification: SignatureVerificationResult;
  releaseRecord?: ReleaseRecord;
  findings: EvidenceFinding[];
  /** Step-by-step audit explanations */
  explanations: string[];
  /** Transparent disclosures of what this verdict DOES and DOES NOT prove */
  caveats: string[];
}

// ============================================================================
// 8. Blockchain Release Records & Network Metadata
// ============================================================================

export interface BlockchainReleaseMetadata {
  contractAddress: `0x${string}`;
  chainId: number;
  networkName: string;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
  explorerTxUrl: string;
  explorerContractUrl: string;
}
