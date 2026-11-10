import { hashSource, type FileDigest } from "../crypto/stream-hash";
import { authenticateManifest } from "../verification/engine";
import type {
  SignedReleaseManifest,
  ReleaseRecord,
  RegistryPublisher,
  TrustAnchorSource,
} from "../verification/types";
import type { ArtifactProfile } from "./release-dna";

export interface BuildArtifactProfileParams {
  id: string;
  fileName: string;
  /** Local file bytes (small, in memory). */
  fileBytes?: Uint8Array;
  /** Digest streamed elsewhere (e.g. `hashFile` in a worker), with the manifest's chunk size. */
  fileDigest?: FileDigest;
  manifest?: SignedReleaseManifest;
  /** Registry entry for the manifest's publisherId */
  publisher?: RegistryPublisher | null;
  /** Release record looked up by the manifest's exact release digest */
  onChainRecord?: ReleaseRecord | null;
  trustSource?: TrustAnchorSource;
}

/**
 * Builds a Release DNA profile using the same trust rules as file verification:
 * a manifest only counts as authenticated when its signature verifies against the
 * registered publisher key AND (if a file is given) the file matches the manifest.
 * The registry record is attached only under the same conditions.
 */
export async function buildArtifactProfile(
  params: BuildArtifactProfileParams
): Promise<ArtifactProfile> {
  const { id, fileName, fileBytes, manifest, publisher, onChainRecord, trustSource } = params;
  const chunkSize =
    manifest?.chunkSize && Number.isSafeInteger(manifest.chunkSize) && manifest.chunkSize > 0
      ? manifest.chunkSize
      : undefined;
  const digest =
    params.fileDigest ?? (fileBytes ? await hashSource(fileBytes, { chunkSize }) : undefined);

  let sha256 = manifest?.sha256.toLowerCase().replace(/^0x/, "") ?? "";
  let fileSize = manifest?.fileSize ?? 0;
  let computedChunkHashes: string[] | undefined;

  if (digest) {
    sha256 = digest.sha256;
    fileSize = digest.size;
    computedChunkHashes = digest.chunkHashes;
  }

  let authenticated = false;
  let releaseRecord: ReleaseRecord | undefined;
  if (manifest) {
    const auth = await authenticateManifest({ manifest, publisher, onChainRecord, trustSource });
    const fileMatchesManifest = !digest || sha256 === manifest.sha256.toLowerCase().replace(/^0x/, "");
    authenticated = auth.signatureResult.isValid && fileMatchesManifest;
    releaseRecord = fileMatchesManifest ? auth.boundRecord ?? undefined : undefined;
  }

  return {
    id,
    fileName,
    fileSize,
    sha256,
    manifest,
    authenticated,
    releaseRecord,
    computedChunkHashes,
    isDemo: trustSource === "DEMO_FIXTURE",
  };
}
