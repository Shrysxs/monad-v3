import { describe, it, expect } from "vitest";
import { getDemoFixtures, type DemoFixtureItem } from "@/lib/demo-data/fixtures";
import { buildArtifactProfile } from "@/lib/risk/artifact-profile";
import { compareArtifacts } from "@/lib/risk/release-dna";

const profile = (f: DemoFixtureItem) =>
  buildArtifactProfile({
    id: f.id,
    fileName: f.fileName,
    fileBytes: f.fileBytes,
    manifest: f.manifest,
    publisher: f.publisher,
    onChainRecord: f.releaseRecord,
    trustSource: "DEMO_FIXTURE",
  });

describe("buildArtifactProfile (Release DNA uses the verification engine)", () => {
  it("authentic vs impostor repack: only the authentic artifact is authenticated", async () => {
    const fx = await getDemoFixtures();
    const a = await profile(fx.find((f) => f.id === "fixture-authentic-aurora")!);
    const b = await profile(fx.find((f) => f.id === "fixture-repacked-aurora")!);

    expect(a.authenticated).toBe(true);
    expect(b.authenticated).toBe(false);
    expect(b.releaseRecord).toBeUndefined();

    const cmp = compareArtifacts(a, b);
    expect(cmp.relationship).toBe("SAME_NAME_DIFFERENT_HASH");
    expect(cmp.diff.publisherMatch).toBe(false);
    expect(cmp.diff.claimedPublisherMatch).toBe(true);
  });

  it("tampered copy: not authenticated, record not attached, one piece differs", async () => {
    const fx = await getDemoFixtures();
    const a = await profile(fx.find((f) => f.id === "fixture-authentic-aurora")!);
    const b = await profile(fx.find((f) => f.id === "fixture-tampered-aurora")!);

    expect(b.authenticated).toBe(false);
    expect(b.releaseRecord).toBeUndefined();
    const cmp = compareArtifacts(a, b);
    expect(cmp.diff.chunkDiff?.differingChunks).toBe(1);
  });
});
