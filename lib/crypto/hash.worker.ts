/// <reference lib="webworker" />
import { hashSource } from "./stream-hash";

export type HashWorkerRequest = { file: Blob; chunkSize?: number };
export type HashWorkerMessage =
  | { type: "progress"; done: number; total: number }
  | { type: "result"; digest: Awaited<ReturnType<typeof hashSource>> }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<HashWorkerRequest>) => {
  const { file, chunkSize } = event.data;
  try {
    let lastPosted = 0;
    const digest = await hashSource(file, {
      chunkSize,
      onProgress: (done, total) => {
        const now = Date.now();
        if (now - lastPosted > 100 || done === total) {
          lastPosted = now;
          ctx.postMessage({ type: "progress", done, total } satisfies HashWorkerMessage);
        }
      },
    });
    ctx.postMessage({ type: "result", digest } satisfies HashWorkerMessage);
  } catch (err) {
    ctx.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    } satisfies HashWorkerMessage);
  }
};
