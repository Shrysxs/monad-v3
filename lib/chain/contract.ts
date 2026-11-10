import {
  getContract,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type PublicClient,
  type WalletClient,
} from "viem";
import SWARMTRACE_REGISTRY_ABI from "./abis/SwarmTraceRegistry.json";
import { monadTestnet, monadPublicClient } from "./monad";
import type {
  ReleaseRecord,
  ReleaseLifecycleStatus,
  RegistryPublisher,
  SignedReleaseManifest,
} from "../verification/types";

export { SWARMTRACE_REGISTRY_ABI };

/**
 * Calculates canonical release digest matching ISwarmTraceRegistry.sol:
 * keccak256(abi.encode(publisherId, productId, releaseVersion, fileHash, manifestDigest))
 */
export function calculateReleaseDigest(
  publisherId: string,
  productId: string,
  releaseVersion: string,
  fileHash: `0x${string}`,
  manifestDigest: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("string, string, string, bytes32, bytes32"),
      [publisherId, productId, releaseVersion, fileHash, manifestDigest]
    )
  );
}

/**
 * Returns the configured SwarmTraceRegistry contract address.
 * Validates format and falls back to placeholder if unset before Phase 2 deployment.
 */
export function getRegistryAddress(): `0x${string}` {
  const envAddr = process.env.NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS;
  if (envAddr && /^0x[a-fA-F0-9]{40}$/.test(envAddr)) {
    return envAddr as `0x${string}`;
  }
  // Default placeholder address prior to testnet deployment
  return "0x0000000000000000000000000000000000000000";
}

/**
 * Checks whether the SwarmTraceRegistry contract has a configured, non-zero address.
 */
export function isRegistryConfigured(): boolean {
  const addr = getRegistryAddress();
  return addr !== "0x0000000000000000000000000000000000000000";
}

/**
 * Creates a typed viem contract instance for SwarmTraceRegistry.
 * Throws if the registry address is unset or zero address to prevent silent execution against null target.
 */
export function getSwarmTraceRegistryContract(client: PublicClient | WalletClient) {
  const address = getRegistryAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "SwarmTraceRegistry address is unconfigured (0x0). Set NEXT_PUBLIC_SWARMTRACE_REGISTRY_ADDRESS in environment."
    );
  }
  return getContract({
    address,
    abi: SWARMTRACE_REGISTRY_ABI,
    client,
  });
}

const STATUS_MAP: ReleaseLifecycleStatus[] = ["UNKNOWN", "ACTIVE", "SUPERSEDED", "REVOKED"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toReleaseRecord(result: any): ReleaseRecord | null {
  if (!result || Number(result.status) === 0) return null;
  return {
    releaseDigest: result.releaseDigest,
    publisherAddress: result.publisherAddress,
    publisherId: result.publisherId,
    productId: result.productId,
    releaseVersion: result.releaseVersion,
    fileHash: result.fileHash,
    manifestDigest: result.manifestDigest,
    signingKey: result.signingKey && result.signingKey !== ZERO_BYTES32 ? result.signingKey : undefined,
    previousReleaseDigest: result.previousReleaseDigest,
    status: STATUS_MAP[Number(result.status)] ?? "UNKNOWN",
    registeredAt: Number(result.registeredAt) * 1000,
    revokedAt: result.revokedAt ? Number(result.revokedAt) * 1000 : undefined,
    revokeReason: result.revokeReason || undefined,
  };
}

function toRegistryPublisher(result: any): RegistryPublisher | null {
  if (!result || !result.publisherAddress || result.publisherAddress === ZERO_ADDRESS) {
    return null;
  }
  return {
    publisherAddress: result.publisherAddress,
    publisherId: result.publisherId,
    ed25519PubKey: result.ed25519PubKey,
    authorizedAt: Number(result.authorizedAt) * 1000,
    isAuthorized: Boolean(result.isAuthorized),
  };
}

function readRegistry(): any {
  return getSwarmTraceRegistryContract(monadPublicClient).read;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/*
 * Read helpers.
 * - Return `null` when the registry is unconfigured or the record does not exist.
 * - THROW on RPC / network failure, so callers can report NETWORK_ERROR instead of
 *   silently treating an outage as "not registered".
 */

/** Queries an on-chain release record by its exact release digest. */
export async function fetchOnChainRelease(
  releaseDigest: `0x${string}`
): Promise<ReleaseRecord | null> {
  if (!isRegistryConfigured()) return null;
  return toReleaseRecord(await readRegistry().getRelease([releaseDigest]));
}

/**
 * Queries the latest release a specific publisher registered for a file SHA-256 hash.
 * Lookups are always scoped to a publisher: a bare file-hash lookup could be answered by
 * whichever publisher happened to register that hash.
 */
export async function fetchOnChainReleaseByFileHash(
  publisherId: string,
  fileHash: `0x${string}`
): Promise<ReleaseRecord | null> {
  if (!isRegistryConfigured()) return null;
  return toReleaseRecord(await readRegistry().getReleaseByFileHash([publisherId, fileHash]));
}

/** Checks whether an address is an authorized publisher. */
export async function checkPublisherAuthorization(
  publisherAddress: `0x${string}`
): Promise<boolean> {
  if (!isRegistryConfigured()) return false;
  return Boolean(await readRegistry().isAuthorizedPublisher([publisherAddress]));
}

/** Reads the registry admin (Ownable owner), who can authorize and deauthorize publishers. */
export async function fetchRegistryOwner(): Promise<`0x${string}` | null> {
  if (!isRegistryConfigured()) return null;
  return (await readRegistry().owner()) as `0x${string}`;
}

/** @deprecated Use RegistryPublisher from lib/verification/types. */
export type OnChainPublisherInfo = RegistryPublisher;

/** Queries publisher information by publisherId. Includes deauthorized publishers (check isAuthorized). */
export async function fetchPublisherById(publisherId: string): Promise<RegistryPublisher | null> {
  if (!isRegistryConfigured()) return null;
  return toRegistryPublisher(await readRegistry().getPublisherById([publisherId]));
}

/** Queries publisher information by address. Includes deauthorized publishers (check isAuthorized). */
export async function fetchPublisherByAddress(
  publisherAddress: `0x${string}`
): Promise<RegistryPublisher | null> {
  if (!isRegistryConfigured()) return null;
  return toRegistryPublisher(await readRegistry().getPublisher([publisherAddress]));
}

export interface RegistryTrustAnchors {
  publisher: RegistryPublisher | null;
  releaseRecord: ReleaseRecord | null;
  networkError: string | null;
}

/**
 * Resolves the trusted inputs for verifying a manifest from the Monad registry:
 *  - the publisher entry (source of the signing key), looked up by the manifest's publisherId
 *  - the release record, looked up by the EXACT release digest computed from the manifest
 *    (publisherId, productId, releaseVersion, sha256, manifestDigest)
 *
 * Nothing here comes from user-typed keys, and the release lookup cannot be shadowed by
 * another publisher registering the same file hash.
 */
export async function resolveRegistryTrustAnchors(
  manifest: SignedReleaseManifest,
  manifestDigestHex: string
): Promise<RegistryTrustAnchors> {
  try {
    const releaseDigest = calculateReleaseDigest(
      manifest.publisherId,
      manifest.productId,
      manifest.releaseVersion,
      `0x${manifest.sha256.toLowerCase().replace(/^0x/, "")}`,
      `0x${manifestDigestHex.toLowerCase().replace(/^0x/, "")}`
    );
    const [publisher, releaseRecord] = await Promise.all([
      fetchPublisherById(manifest.publisherId),
      fetchOnChainRelease(releaseDigest),
    ]);
    return { publisher, releaseRecord, networkError: null };
  } catch (err) {
    return {
      publisher: null,
      releaseRecord: null,
      networkError:
        (err as { shortMessage?: string })?.shortMessage ||
        (err instanceof Error ? err.message : "Failed to query Monad Testnet RPC"),
    };
  }
}
