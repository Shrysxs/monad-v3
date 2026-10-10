import { describe, it, expect } from "vitest";
import { compareArtifacts, type ArtifactProfile } from "@/lib/risk/release-dna";
import type { SignedReleaseManifest, ReleaseRecord } from "@/lib/verification/types";

describe("Release DNA Forensics Engine", () => {
  const dummyManifestA: SignedReleaseManifest = {
    schemaVersion: "1.0.0",
    publisherId: "canonical-ubuntu",
    productId: "ubuntu-server",
    releaseVersion: "24.04.1",
    fileName: "ubuntu-24.04.1-live-server-amd64.iso",
    fileSize: 2000000000,
    sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chunkSize: 1048576,
    chunkHashes: ["c111", "c222", "c333", "c444"],
    publisherKeyId: "key-ubuntu-1",
    signature: "sig123",
  };

  const activeRecordA: ReleaseRecord = {
    releaseDigest: "0xaaaa111100000000000000000000000000000000000000000000000000000000",
    publisherAddress: "0x1111111111111111111111111111111111111111",
    publisherId: "canonical-ubuntu",
    productId: "ubuntu-server",
    releaseVersion: "24.04.1",
    fileHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "0x1234000000000000000000000000000000000000000000000000000000000000",
    previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
    status: "ACTIVE",
    registeredAt: 1714000000,
    blockNumber: 1000n,
  };

  it("classifies identical SHA-256 artifacts as EXACT_MATCH", () => {
    const artifactA: ArtifactProfile = {
      id: "art-1",
      fileName: "ubuntu-24.04.1-live-server-amd64.iso",
      fileSize: 2000000000,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      manifest: dummyManifestA,
      releaseRecord: activeRecordA,
    };

    const artifactB: ArtifactProfile = {
      id: "art-2",
      fileName: "ubuntu-24.04.1-live-server-amd64.iso",
      fileSize: 2000000000,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      manifest: dummyManifestA,
      releaseRecord: activeRecordA,
    };

    const comparison = compareArtifacts(artifactA, artifactB);
    expect(comparison.relationship).toBe("EXACT_MATCH");
    expect(comparison.diff.hashMatch).toBe(true);
    expect(comparison.diff.fileNameMatch).toBe(true);
    expect(comparison.diff.sizeMatch).toBe(true);
    expect(comparison.lineageEdges[0].relationship).toBe("identical_to");
  });

  it("detects SAME_NAME_DIFFERENT_HASH when filename matches but SHA-256 differs (repack / backdoored clone)", () => {
    const artifactA: ArtifactProfile = {
      id: "art-canonical",
      fileName: "ubuntu-24.04.1-live-server-amd64.iso",
      fileSize: 2000000000,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      manifest: dummyManifestA,
      releaseRecord: activeRecordA,
    };

    const artifactB: ArtifactProfile = {
      id: "art-untrusted-torrent",
      fileName: "ubuntu-24.04.1-live-server-amd64.iso",
      fileSize: 2000050000,
      sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    };

    const comparison = compareArtifacts(artifactA, artifactB);
    expect(comparison.relationship).toBe("SAME_NAME_DIFFERENT_HASH");
    expect(comparison.diff.fileNameMatch).toBe(true);
    expect(comparison.diff.hashMatch).toBe(false);
    expect(comparison.diff.sizeMatch).toBe(false);
    expect(comparison.diff.sizeDeltaBytes).toBe(-50000);
  });

  it("detects VERSION_UPDATE when publisher matches and versions differ", () => {
    const artifactV1: ArtifactProfile = {
      id: "art-v1",
      fileName: "ubuntu-24.04.0-live-server-amd64.iso",
      fileSize: 1980000000,
      sha256: "1111111111111111111111111111111111111111111111111111111111111111",
      manifest: {
        ...dummyManifestA,
        releaseVersion: "24.04.0",
        fileName: "ubuntu-24.04.0-live-server-amd64.iso",
        sha256: "1111111111111111111111111111111111111111111111111111111111111111",
      },
      releaseRecord: {
        ...activeRecordA,
        releaseVersion: "24.04.0",
        status: "ACTIVE",
      },
    };

    const artifactV2: ArtifactProfile = {
      id: "art-v2",
      fileName: "ubuntu-24.04.1-live-server-amd64.iso",
      fileSize: 2000000000,
      sha256: "2222222222222222222222222222222222222222222222222222222222222222",
      manifest: {
        ...dummyManifestA,
        releaseVersion: "24.04.1",
        fileName: "ubuntu-24.04.1-live-server-amd64.iso",
        sha256: "2222222222222222222222222222222222222222222222222222222222222222",
      },
      releaseRecord: {
        ...activeRecordA,
        releaseVersion: "24.04.1",
        status: "ACTIVE",
      },
    };

    const comparison = compareArtifacts(artifactV1, artifactV2);
    expect(comparison.relationship).toBe("VERSION_UPDATE");
    expect(comparison.diff.publisherMatch).toBe(true);
    expect(comparison.diff.versionMatch).toBe(false);
    expect(comparison.diff.versionA).toBe("24.04.0");
    expect(comparison.diff.versionB).toBe("24.04.1");
  });

  it("identifies REVOKED_VARIANT when one artifact is revoked on-chain", () => {
    const revokedRecord: ReleaseRecord = {
      ...activeRecordA,
      status: "REVOKED",
      revokeReason: "Critical security flaw discovered in installer",
    };

    const artifactRevoked: ArtifactProfile = {
      id: "art-revoked",
      fileName: "compromised-package.tar.gz",
      fileSize: 1500000,
      sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      releaseRecord: revokedRecord,
    };

    const artifactOther: ArtifactProfile = {
      id: "art-other",
      fileName: "clean-package.tar.gz",
      fileSize: 1500000,
      sha256: "9999999999999999999999999999999999999999999999999999999999999999",
      releaseRecord: activeRecordA,
    };

    const comparison = compareArtifacts(artifactRevoked, artifactOther);
    expect(comparison.relationship).toBe("REVOKED_VARIANT");
    expect(comparison.diff.statusA).toBe("REVOKED");
    expect(comparison.explanation).toContain("revoked");
  });

  it("calculates chunk-level diff between two artifacts with chunk hashes", () => {
    const artifactA: ArtifactProfile = {
      id: "art-chunks-a",
      fileName: "payload.bin",
      fileSize: 4096,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      manifest: {
        ...dummyManifestA,
        chunkHashes: ["chunk_1", "chunk_2", "chunk_3", "chunk_4"],
      },
    };

    const artifactB: ArtifactProfile = {
      id: "art-chunks-b",
      fileName: "payload.bin",
      fileSize: 4096,
      sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      manifest: {
        ...dummyManifestA,
        // Chunks 1 and 2 match; chunk 3 and 4 are changed
        chunkHashes: ["chunk_1", "chunk_2", "chunk_modified_3", "chunk_modified_4"],
      },
    };

    const comparison = compareArtifacts(artifactA, artifactB);
    expect(comparison.diff.chunkDiff).toBeDefined();
    expect(comparison.diff.chunkDiff?.chunksA).toBe(4);
    expect(comparison.diff.chunkDiff?.chunksB).toBe(4);
    expect(comparison.diff.chunkDiff?.identicalChunks).toBe(2);
    expect(comparison.diff.chunkDiff?.differingChunks).toBe(2);
  });

  it("verifies direct on-chain supersession lineage via previousReleaseDigest", () => {
    const v1Digest = "0x1111000000000000000000000000000000000000000000000000000000000000";
    const v2Digest = "0x2222000000000000000000000000000000000000000000000000000000000000";

    const artifactV1: ArtifactProfile = {
      id: "art-v1",
      fileName: "node-v1.0.tar.gz",
      fileSize: 1000,
      sha256: "1111111111111111111111111111111111111111111111111111111111111111",
      releaseRecord: {
        ...activeRecordA,
        releaseDigest: v1Digest,
        releaseVersion: "1.0.0",
        status: "SUPERSEDED",
        previousReleaseDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
    };

    const artifactV2: ArtifactProfile = {
      id: "art-v2",
      fileName: "node-v2.0.tar.gz",
      fileSize: 1100,
      sha256: "2222222222222222222222222222222222222222222222222222222222222222",
      releaseRecord: {
        ...activeRecordA,
        releaseDigest: v2Digest,
        releaseVersion: "2.0.0",
        status: "ACTIVE",
        previousReleaseDigest: v1Digest,
      },
    };

    const comparison = compareArtifacts(artifactV2, artifactV1);
    expect(comparison.relationship).toBe("SUPERSEDED_VARIANT");
    expect(comparison.diff.onChainLineageVerified).toBe(true);
    expect(comparison.diff.onChainPredecessor).toBe("B");
    expect(comparison.verdictTitle).toBe("Authenticated On-Chain Supersession");
  });
});
