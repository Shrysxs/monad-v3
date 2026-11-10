import { describe, it, expect } from "vitest";
import { hashSource } from "@/lib/crypto/stream-hash";
import { sha256Bytes, hashChunks } from "@/lib/crypto/hashing";

describe("Streaming file hashing", () => {
  // Larger than one 8 MiB read slice, with a piece size that does not divide it evenly.
  const size = 9 * 1024 * 1024 + 13;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) data[i] = (i * 31 + 7) & 0xff;
  const chunkSize = 1024 * 1024 + 7;

  it("matches Web Crypto for whole-file and piece hashes across read-slice boundaries", async () => {
    const digest = await hashSource(data, { chunkSize });
    expect(digest.sha256).toBe(await sha256Bytes(data));
    expect(digest.size).toBe(size);
    expect(digest.chunkHashes).toEqual((await hashChunks(data, chunkSize)).chunkHashes);
  });

  it("produces the same digest from a Blob as from bytes and reports progress", async () => {
    const progress: number[] = [];
    const fromBlob = await hashSource(new Blob([data]), {
      chunkSize,
      onProgress: (done) => progress.push(done),
    });
    expect(fromBlob).toEqual(await hashSource(data, { chunkSize }));
    expect(progress[progress.length - 1]).toBe(size);
  });

  it("hashes an empty file", async () => {
    const digest = await hashSource(new Uint8Array(0), { chunkSize: 16 });
    expect(digest.sha256).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(digest.chunkHashes).toEqual([]);
  });
});
