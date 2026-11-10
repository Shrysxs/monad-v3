import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

/** Result of hashing a file: whole-file SHA-256 plus optional sequential piece hashes. */
export interface FileDigest {
  /** Lowercase hex SHA-256 of the whole file (no 0x) */
  sha256: string;
  /** Size in bytes */
  size: number;
  /** Piece size the piece hashes were computed with */
  chunkSize?: number;
  /** Lowercase hex SHA-256 of each sequential piece of `chunkSize` bytes */
  chunkHashes?: string[];
}

/** Anything that can be read in slices: a File/Blob, or bytes already in memory. */
export type HashSource = Blob | Uint8Array;

const READ_SLICE = 8 * 1024 * 1024; // bytes read from disk per step

async function readSlice(source: HashSource, start: number, end: number): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source.subarray(start, end);
  return new Uint8Array(await source.slice(start, end).arrayBuffer());
}

/**
 * Hashes a file incrementally. Only one slice (≤ 8 MiB) is held in memory at a time,
 * so multi-GB files can be hashed without loading them whole. Works in a Web Worker,
 * on the main thread, and in Node.
 */
export async function hashSource(
  source: HashSource,
  options: { chunkSize?: number; onProgress?: (bytesDone: number, total: number) => void } = {}
): Promise<FileDigest> {
  const { chunkSize, onProgress } = options;
  if (chunkSize !== undefined && (!Number.isSafeInteger(chunkSize) || chunkSize <= 0)) {
    throw new RangeError("chunkSize must be a positive integer");
  }

  const total = source instanceof Uint8Array ? source.byteLength : source.size;
  const whole = sha256.create();
  const chunkHashes: string[] = [];
  let piece = chunkSize ? sha256.create() : null;
  let pieceFill = 0;

  for (let offset = 0; offset < total; offset += READ_SLICE) {
    const bytes = await readSlice(source, offset, Math.min(offset + READ_SLICE, total));
    whole.update(bytes);

    if (piece && chunkSize) {
      let pos = 0;
      while (pos < bytes.byteLength) {
        const take = Math.min(chunkSize - pieceFill, bytes.byteLength - pos);
        piece.update(bytes.subarray(pos, pos + take));
        pieceFill += take;
        pos += take;
        if (pieceFill === chunkSize) {
          chunkHashes.push(bytesToHex(piece.digest()));
          piece = sha256.create();
          pieceFill = 0;
        }
      }
    }
    onProgress?.(Math.min(offset + READ_SLICE, total), total);
  }
  if (piece && pieceFill > 0) {
    chunkHashes.push(bytesToHex(piece.digest()));
  }

  return {
    sha256: bytesToHex(whole.digest()),
    size: total,
    ...(chunkSize ? { chunkSize, chunkHashes } : {}),
  };
}
