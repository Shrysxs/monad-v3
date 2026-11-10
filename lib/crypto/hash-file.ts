import { hashSource, type FileDigest } from "./stream-hash";
import type { HashWorkerMessage } from "./hash.worker";

export type { FileDigest };

/**
 * Hashes a user-selected file off the main thread (Web Worker), streaming it from disk
 * so the UI stays responsive and multi-GB files do not exhaust memory.
 * Falls back to streaming on the main thread where workers are unavailable.
 */
export function hashFile(
  file: Blob,
  options: { chunkSize?: number; onProgress?: (fraction: number) => void } = {}
): Promise<FileDigest> {
  const { chunkSize, onProgress } = options;

  if (typeof Worker === "undefined") {
    return hashSource(file, { chunkSize, onProgress: (d, t) => onProgress?.(t ? d / t : 1) });
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<HashWorkerMessage>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        onProgress?.(msg.total ? msg.done / msg.total : 1);
      } else {
        worker.terminate();
        if (msg.type === "result") resolve(msg.digest);
        else reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Hash worker failed"));
    };
    worker.postMessage({ file, chunkSize });
  });
}
