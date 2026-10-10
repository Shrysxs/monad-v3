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
import type { ReleaseRecord, ReleaseLifecycleStatus } from "../verification/types";

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

/**
 * Queries an on-chain release record by release digest from Monad Testnet.
 */
export async function fetchOnChainRelease(
  releaseDigest: `0x${string}`
): Promise<ReleaseRecord | null> {
  const address = getRegistryAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  try {
    const contract = getSwarmTraceRegistryContract(monadPublicClient);
    const result = (await (contract.read as any).getRelease([releaseDigest])) as any;
    if (!result || result.status === 0) return null;

    return {
      releaseDigest: result.releaseDigest,
      publisherAddress: result.publisherAddress,
      publisherId: result.publisherId,
      productId: result.productId,
      releaseVersion: result.releaseVersion,
      fileHash: result.fileHash,
      manifestDigest: result.manifestDigest,
      previousReleaseDigest: result.previousReleaseDigest,
      status: STATUS_MAP[result.status] ?? "UNKNOWN",
      registeredAt: Number(result.registeredAt) * 1000,
      revokedAt: result.revokedAt ? Number(result.revokedAt) * 1000 : undefined,
      revokeReason: result.revokeReason || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Queries an on-chain release record by file SHA-256 hash from Monad Testnet.
 */
export async function fetchOnChainReleaseByFileHash(
  fileHash: `0x${string}`
): Promise<ReleaseRecord | null> {
  const address = getRegistryAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  try {
    const contract = getSwarmTraceRegistryContract(monadPublicClient);
    const result = (await (contract.read as any).getReleaseByFileHash([fileHash])) as any;
    if (!result || result.status === 0) return null;

    return {
      releaseDigest: result.releaseDigest,
      publisherAddress: result.publisherAddress,
      publisherId: result.publisherId,
      productId: result.productId,
      releaseVersion: result.releaseVersion,
      fileHash: result.fileHash,
      manifestDigest: result.manifestDigest,
      previousReleaseDigest: result.previousReleaseDigest,
      status: STATUS_MAP[result.status] ?? "UNKNOWN",
      registeredAt: Number(result.registeredAt) * 1000,
      revokedAt: result.revokedAt ? Number(result.revokedAt) * 1000 : undefined,
      revokeReason: result.revokeReason || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether an address is an authorized publisher on Monad Testnet.
 */
export async function checkPublisherAuthorization(
  publisherAddress: `0x${string}`
): Promise<boolean> {
  const address = getRegistryAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    return false;
  }

  try {
    const contract = getSwarmTraceRegistryContract(monadPublicClient);
    return (await (contract.read as any).isAuthorizedPublisher([publisherAddress])) as boolean;
  } catch {
    return false;
  }
}

export interface OnChainPublisherInfo {
  publisherAddress: `0x${string}`;
  publisherId: string;
  ed25519PubKey: `0x${string}`;
  authorizedAt: number;
  isAuthorized: boolean;
}

/**
 * Queries publisher information by publisherId from Monad Testnet.
 */
export async function fetchPublisherById(
  publisherId: string
): Promise<OnChainPublisherInfo | null> {
  const address = getRegistryAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  try {
    const contract = getSwarmTraceRegistryContract(monadPublicClient);
    const result = (await (contract.read as any).getPublisherById([publisherId])) as any;
    if (
      !result ||
      !result.publisherAddress ||
      result.publisherAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return null;
    }

    return {
      publisherAddress: result.publisherAddress,
      publisherId: result.publisherId,
      ed25519PubKey: result.ed25519PubKey,
      authorizedAt: Number(result.authorizedAt) * 1000,
      isAuthorized: Boolean(result.isAuthorized),
    };
  } catch {
    return null;
  }
}

/**
 * Queries publisher information by address from Monad Testnet.
 */
export async function fetchPublisherByAddress(
  publisherAddress: `0x${string}`
): Promise<OnChainPublisherInfo | null> {
  const address = getRegistryAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  try {
    const contract = getSwarmTraceRegistryContract(monadPublicClient);
    const result = (await (contract.read as any).getPublisher([publisherAddress])) as any;
    if (
      !result ||
      !result.publisherAddress ||
      result.publisherAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return null;
    }

    return {
      publisherAddress: result.publisherAddress,
      publisherId: result.publisherId,
      ed25519PubKey: result.ed25519PubKey,
      authorizedAt: Number(result.authorizedAt) * 1000,
      isAuthorized: Boolean(result.isAuthorized),
    };
  } catch {
    return null;
  }
}

