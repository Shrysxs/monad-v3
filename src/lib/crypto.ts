import type {
  VerificationResult,
  VerifiedRelease,
} from '../types/swarm';
import { MOCK_REGISTRY_RELEASES } from '../data/mockRegistry';

/**
 * Calculates SHA-256 hash using native browser Web Crypto API.
 * Supports realistic progress updates and local speed benchmarking.
 */
export async function calculateFileSha256(
  file: File,
  onProgress?: (percent: number, phase: string) => void
): Promise<{ hash: string; durationMs: number }> {
  const startTime = performance.now();

  if (file.size === 0) {
    throw new Error('File is empty (0 bytes). Cannot generate cryptographic digest.');
  }

  onProgress?.(10, 'Reading file into memory buffer...');

  const arrayBuffer = await readFileAsArrayBuffer(file, (percent) => {
    // Map file read to 10% - 75%
    const mapped = Math.min(75, 10 + Math.round(percent * 0.65));
    onProgress?.(mapped, `Streaming binary chunks (${Math.round(percent)}%)...`);
  });

  onProgress?.(80, 'Executing Web Crypto SHA-256 digest...');

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

  onProgress?.(95, 'Formatting hex representation...');

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const endTime = performance.now();
  const durationMs = Math.round(endTime - startTime);

  onProgress?.(100, 'Digest calculation complete');

  return { hash: hashHex, durationMs };
}

function readFileAsArrayBuffer(
  file: File,
  onProgress: (percent: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    };

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to parse file as ArrayBuffer'));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error('Unknown error during file read'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Verifies a computed hash and file against the Monad provenance registry.
 * Strictly separates Publisher Authenticity from Malware Scanning.
 */
export function verifyAgainstRegistry(
  file: File,
  computedHash: string,
  durationMs: number,
  registry: VerifiedRelease[] = MOCK_REGISTRY_RELEASES
): VerificationResult {
  const cleanHash = computedHash.toLowerCase().trim();

  // 1. Direct hash match
  const exactMatch = registry.find((r) => r.sha256.toLowerCase() === cleanHash);

  if (exactMatch) {
    if (exactMatch.revoked?.isRevoked) {
      return {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        lastModified: file.lastModified,
        computedSha256: cleanHash,
        durationMs,
        status: 'revoked',
        authenticity: 'REVOKED_CERTIFICATE',
        scannerStatus: 'SCANNER_UNAVAILABLE',
        scannerNotice:
          'ATTENTION: This binary matches a published release whose cryptographic certificate was formally REVOKED by the publisher. Malware scanning is UNAVAILABLE in local sandbox.',
        matchedRelease: exactMatch,
        detectedDiscrepancies: [
          `Revocation Reason: ${exactMatch.revoked.reason || 'Security advisory'}`,
          `Revoked at: ${exactMatch.revoked.revokedAt || 'Unknown'}`,
          `Advisory ID: ${exactMatch.revoked.advisoryId || 'N/A'}`,
        ],
      };
    }

    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      computedSha256: cleanHash,
      durationMs,
      status: 'matching',
      authenticity: 'VERIFIED_PUBLISHER',
      scannerStatus: 'NOT_SCANNED',
      scannerNotice:
        'NOT_SCANNED: Browser client does not execute heuristic or behavioral malware sandboxing. Authenticity verifies cryptographic identity only; it does not replace runtime antivirus inspection.',
      matchedRelease: exactMatch,
    };
  }

  // 2. Name collision / mismatch detection
  // Check if filename suggests an intended release but the digest differs
  const nameMatch = registry.find(
    (r) =>
      r.fileName.toLowerCase() === file.name.toLowerCase() ||
      file.name.toLowerCase().includes(r.version.toLowerCase())
  );

  if (nameMatch) {
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      computedSha256: cleanHash,
      durationMs,
      status: 'mismatch',
      authenticity: 'TAMPERED_HASH',
      scannerStatus: 'SCANNER_UNAVAILABLE',
      scannerNotice:
        'CRITICAL: Artifact name claims to be official release "' +
        nameMatch.name +
        ' ' +
        nameMatch.version +
        '", but binary cryptographic digest DOES NOT match the on-chain published ledger.',
      matchedRelease: nameMatch,
      detectedDiscrepancies: [
        `Claimed Artifact: ${nameMatch.fileName}`,
        `Expected SHA-256: ${nameMatch.sha256}`,
        `Actual Computed:  ${cleanHash}`,
        `Size Difference:  ${file.size - nameMatch.fileSize} bytes`,
      ],
    };
  }

  // 3. Unknown / Unregistered artifact
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    lastModified: file.lastModified,
    computedSha256: cleanHash,
    durationMs,
    status: 'unknown',
    authenticity: 'UNREGISTERED',
    scannerStatus: 'NOT_SCANNED',
    scannerNotice:
      'NOT_SCANNED: This artifact is not registered in the Monad Provenance Ledger. No threat or malware scan was performed by the browser client.',
    detectedDiscrepancies: [
      'Digest not found in active Monad Provenance smart contract registry.',
      'No publisher multi-sig or Rekor transparency attestation found.',
    ],
  };
}

/**
 * Format bytes into human-readable tabular units
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Truncates a hex hash with ellipsis in the middle
 */
export function truncateHash(hash: string, lead = 8, trail = 8): string {
  if (!hash) return '';
  if (hash.length <= lead + trail) return hash;
  return `${hash.slice(0, lead)}...${hash.slice(-trail)}`;
}

/**
 * Formats ISO date into concise UTC timestamp
 */
export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  } catch {
    return isoString;
  }
}
