/**
 * Cryptographic Hashing Utilities (Web Crypto API SHA-256)
 * Supports browser, worker, and Node.js runtimes.
 */

export async function sha256Bytes(data: Uint8Array | ArrayBuffer): Promise<string> {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is unavailable in this environment");
  }

  // Ensure ArrayBufferView is properly passed to digest
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  const hashBuffer = await cryptoObj.subtle.digest("SHA-256", buffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Text(text: string): Promise<string> {
  const encoder = new TextEncoder();
  return sha256Bytes(encoder.encode(text));
}

/**
 * Splits a byte buffer into sequential chunks of chunkSize and hashes each piece.
 */
export async function hashChunks(
  data: Uint8Array,
  chunkSize: number
): Promise<{ chunkHashes: string[]; totalChunks: number }> {
  if (chunkSize <= 0) {
    throw new RangeError("Chunk size must be greater than 0");
  }

  const chunkHashes: string[] = [];
  const totalChunks = Math.ceil(data.byteLength / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.byteLength);
    const slice = data.subarray(start, end);
    const hash = await sha256Bytes(slice);
    chunkHashes.push(hash);
  }

  return { chunkHashes, totalChunks };
}
