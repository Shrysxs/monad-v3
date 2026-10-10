import type {
  SignedReleaseManifest,
  ReleaseRecord,
  ReleaseLifecycleStatus,
} from "../verification/types";

export type VariantRelationship =
  | "EXACT_MATCH"                 // Identical SHA-256 and identical manifest
  | "SAME_NAME_DIFFERENT_HASH"    // Identical filename, but completely different byte content
  | "VERSION_UPDATE"              // Authentic version evolution for the same product
  | "SUPERSEDED_VARIANT"          // One artifact is an older superseded release
  | "REVOKED_VARIANT"             // One or both artifacts belong to a revoked release
  | "UNKNOWN_VARIANT";            // One or both artifacts lack authenticated provenance

export interface ArtifactProfile {
  id: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  manifest?: SignedReleaseManifest;
  releaseRecord?: ReleaseRecord;
  isDemo?: boolean;
}

export interface ComparisonDiff {
  fileNameMatch: boolean;
  hashMatch: boolean;
  sizeMatch: boolean;
  sizeDeltaBytes: number;
  publisherMatch: boolean;
  versionMatch: boolean;
  versionA?: string;
  versionB?: string;
  statusA: ReleaseLifecycleStatus;
  statusB: ReleaseLifecycleStatus;
  onChainLineageVerified?: boolean;
  onChainPredecessor?: "A" | "B" | "NONE";
  chunkDiff?: {
    chunksA: number;
    chunksB: number;
    identicalChunks: number;
    differingChunks: number;
  };
}

export interface LineageNode {
  id: string;
  label: string;
  version: string;
  sha256Prefix: string;
  status: ReleaseLifecycleStatus;
  publisherId: string;
  isTarget?: boolean;
}

export interface LineageEdge {
  source: string;
  target: string;
  relationship: "supersedes" | "variant_of" | "identical_to";
}

export interface ReleaseDnaComparison {
  relationship: VariantRelationship;
  verdictTitle: string;
  explanation: string;
  artifactA: ArtifactProfile;
  artifactB: ArtifactProfile;
  diff: ComparisonDiff;
  lineageNodes: LineageNode[];
  lineageEdges: LineageEdge[];
}

/**
 * Performs side-by-side forensic comparison between two file artifacts or releases.
 */
export function compareArtifacts(
  artifactA: ArtifactProfile,
  artifactB: ArtifactProfile
): ReleaseDnaComparison {
  const hashMatch = artifactA.sha256.toLowerCase() === artifactB.sha256.toLowerCase();
  const fileNameMatch = artifactA.fileName.toLowerCase() === artifactB.fileName.toLowerCase();
  const sizeMatch = artifactA.fileSize === artifactB.fileSize;
  const sizeDeltaBytes = artifactA.fileSize - artifactB.fileSize;

  const pubA = artifactA.manifest?.publisherId ?? artifactA.releaseRecord?.publisherId;
  const pubB = artifactB.manifest?.publisherId ?? artifactB.releaseRecord?.publisherId;
  const publisherMatch = !!(pubA && pubB && pubA === pubB);

  const verA = artifactA.manifest?.releaseVersion ?? artifactA.releaseRecord?.releaseVersion;
  const verB = artifactB.manifest?.releaseVersion ?? artifactB.releaseRecord?.releaseVersion;
  const versionMatch = !!(verA && verB && verA === verB);

  const statusA: ReleaseLifecycleStatus = artifactA.releaseRecord?.status ?? "UNKNOWN";
  const statusB: ReleaseLifecycleStatus = artifactB.releaseRecord?.status ?? "UNKNOWN";

  // Chunk diff calculation if both provide chunk hashes
  let chunkDiff: ComparisonDiff["chunkDiff"];
  const chunksA = artifactA.manifest?.chunkHashes;
  const chunksB = artifactB.manifest?.chunkHashes;

  if (chunksA && chunksB) {
    const minLen = Math.min(chunksA.length, chunksB.length);
    let identical = 0;
    for (let i = 0; i < minLen; i++) {
      if (chunksA[i].toLowerCase() === chunksB[i].toLowerCase()) {
        identical++;
      }
    }
    chunkDiff = {
      chunksA: chunksA.length,
      chunksB: chunksB.length,
      identicalChunks: identical,
      differingChunks: Math.max(chunksA.length, chunksB.length) - identical,
    };
  }

  // On-chain lineage check
  const recA = artifactA.releaseRecord;
  const recB = artifactB.releaseRecord;
  let onChainLineageVerified = false;
  let onChainPredecessor: "A" | "B" | "NONE" = "NONE";

  if (recA && recB) {
    const prevA = recA.previousReleaseDigest?.toLowerCase().replace(/^0x/, "");
    const prevB = recB.previousReleaseDigest?.toLowerCase().replace(/^0x/, "");
    const digA = recA.releaseDigest?.toLowerCase().replace(/^0x/, "");
    const digB = recB.releaseDigest?.toLowerCase().replace(/^0x/, "");
    const zero = "0000000000000000000000000000000000000000000000000000000000000000";

    if (prevA && prevA !== zero && prevA === digB) {
      onChainLineageVerified = true;
      onChainPredecessor = "B";
    } else if (prevB && prevB !== zero && prevB === digA) {
      onChainLineageVerified = true;
      onChainPredecessor = "A";
    }
  }

  // Determine relationship classification
  let relationship: VariantRelationship;
  let verdictTitle: string;
  let explanation: string;

  if (hashMatch) {
    relationship = "EXACT_MATCH";
    verdictTitle = "Identical Artifacts";
    explanation = "Both artifacts have matching SHA-256 hashes and represent the identical byte payload.";
  } else if (statusA === "REVOKED" || statusB === "REVOKED") {
    relationship = "REVOKED_VARIANT";
    verdictTitle = "Revoked Release Detected";
    explanation = "At least one compared artifact is associated with a release explicitly revoked on Monad.";
  } else if (onChainLineageVerified) {
    relationship = "SUPERSEDED_VARIANT";
    verdictTitle = "Authenticated On-Chain Supersession";
    explanation =
      onChainPredecessor === "B"
        ? `On-chain lineage confirmed: Artifact A (${verA ?? "new"}) explicitly supersedes Artifact B (${verB ?? "old"}) on Monad Testnet.`
        : `On-chain lineage confirmed: Artifact B (${verB ?? "new"}) explicitly supersedes Artifact A (${verA ?? "old"}) on Monad Testnet.`;
  } else if (statusA === "SUPERSEDED" || statusB === "SUPERSEDED") {
    relationship = "SUPERSEDED_VARIANT";
    verdictTitle = "Superseded Historical Version";
    explanation = "One artifact represents a legitimate older release that has been superseded by an update.";
  } else if (publisherMatch && verA !== verB && verA && verB) {
    relationship = "VERSION_UPDATE";
    verdictTitle = "Version Evolution";
    explanation = `Artifacts represent different versions (${verA} vs ${verB}) published by the same authenticated vendor (${pubA}).`;
  } else if (fileNameMatch && !hashMatch) {
    relationship = "SAME_NAME_DIFFERENT_HASH";
    verdictTitle = "Identical Filename, Different Content";
    explanation = `Both artifacts are named "${artifactA.fileName}", but their byte contents and SHA-256 hashes differ. Filename alone does not prove identical origin.`;
  } else {
    relationship = "UNKNOWN_VARIANT";
    verdictTitle = "Unknown or Uncorrelated Artifacts";
    explanation = "No authenticated common publisher or lineage relationship links these two artifacts.";
  }

  const diff: ComparisonDiff = {
    fileNameMatch,
    hashMatch,
    sizeMatch,
    sizeDeltaBytes,
    publisherMatch,
    versionMatch,
    versionA: verA,
    versionB: verB,
    statusA,
    statusB,
    onChainLineageVerified,
    onChainPredecessor,
    chunkDiff,
  };

  // Build Lineage Graph Nodes
  const lineageNodes: LineageNode[] = [
    {
      id: artifactA.id,
      label: artifactA.fileName,
      version: verA ?? "unknown",
      sha256Prefix: artifactA.sha256.slice(0, 8),
      status: statusA,
      publisherId: pubA ?? "unregistered",
      isTarget: true,
    },
    {
      id: artifactB.id,
      label: artifactB.fileName,
      version: verB ?? "unknown",
      sha256Prefix: artifactB.sha256.slice(0, 8),
      status: statusB,
      publisherId: pubB ?? "unregistered",
      isTarget: false,
    },
  ];

  const lineageEdges: LineageEdge[] = [
    {
      source: artifactA.id,
      target: artifactB.id,
      relationship: hashMatch
        ? "identical_to"
        : relationship === "VERSION_UPDATE" || relationship === "SUPERSEDED_VARIANT"
        ? "supersedes"
        : "variant_of",
    },
  ];

  return {
    relationship,
    verdictTitle,
    explanation,
    artifactA,
    artifactB,
    diff,
    lineageNodes,
    lineageEdges,
  };
}
