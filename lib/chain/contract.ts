import { getContract, keccak256, encodePacked, type PublicClient, type WalletClient } from "viem";
import SWARMTRACE_REGISTRY_ABI from "./abis/SwarmTraceRegistry.json";
import { monadTestnet } from "./monad";

export { SWARMTRACE_REGISTRY_ABI };

/**
 * Calculates canonical release digest matching ISwarmTraceRegistry.sol:
 * keccak256(abi.encodePacked(publisherId, productId, releaseVersion, fileHash, manifestDigest))
 */
export function calculateReleaseDigest(
  publisherId: string,
  productId: string,
  releaseVersion: string,
  fileHash: `0x${string}`,
  manifestDigest: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["string", "string", "string", "bytes32", "bytes32"],
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
 * Creates a typed viem contract instance for SwarmTraceRegistry.
 */
export function getSwarmTraceRegistryContract(client: PublicClient | WalletClient) {
  return getContract({
    address: getRegistryAddress(),
    abi: SWARMTRACE_REGISTRY_ABI,
    client,
  });
}
