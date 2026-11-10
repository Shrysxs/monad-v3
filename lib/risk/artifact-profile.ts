import { sha256Bytes, hashChunks } from "../crypto/hashing";
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
  /** Local file bytes. When absent, size and hash are taken from the manifest. */
  fileBytes?: Uint8Array;
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

  let sha256 = manifest?.sha256.toLowerCase().replace(/^0x/, "") ?? "";
  let fileSize = manifest?.fileSize ?? 0;
  let computedChunkHashes: string[] | undefined;

  if (fileBytes) {
    sha256 = await sha256Bytes(fileBytes);
    fileSize = fileBytes.byteLength;
    if (manifest?.chunkSize && Number.isInteger(manifest.chunkSize) && manifest.chunkSize > 0) {
      computedChunkHashes = (await hashChunks(fileBytes, manifest.chunkSize)).chunkHashes;
    }
  }

  let authenticated = false;
  let releaseRecord: ReleaseRecord | undefined;
  if (manifest) {
    const auth = await authenticateManifest({ manifest, publisher, onChainRecord, trustSource });
    const fileMatchesManifest = !fileBytes || sha256 === manifest.sha256.toLowerCase().replace(/^0x/, "");
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
