import { describe, it, expect } from "vitest";
import { getDemoFixtures, type DemoFixtureItem } from "@/lib/demo-data/fixtures";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";

describe("Demo Data Fixtures", () => {
  function verifyFixture(f: DemoFixtureItem) {
    return verifyFileAgainstManifest({
      fileBytes: f.fileBytes,
      fileName: f.fileName,
      manifest: f.manifest,
      publisher: f.publisher,
      onChainRecord: f.releaseRecord,
      trustSource: "DEMO_FIXTURE",
    });
  }

  it("provides labeled fixtures backed by the demo registry", async () => {
    const fixtures = await getDemoFixtures();
    expect(fixtures).toHaveLength(6);

    for (const f of fixtures) {
      expect(f.demoOnly).toBe(true);
      expect(f.manifest.schemaVersion).toBe("1.0.0");
      expect(f.publisher).not.toBeNull();
    }
  });

  it.each([
    ["fixture-authentic-aurora", "MATCHING_AUTHENTICATED_RELEASE"],
    ["fixture-tampered-aurora", "HASH_MISMATCH"],
    ["fixture-repacked-aurora", "INVALID_MANIFEST_SIGNATURE"],
    ["fixture-revoked-nimbus", "REVOKED_RELEASE"],
    ["fixture-superseded-nimbus", "SUPERSEDED_RELEASE"],
    ["fixture-prerotation-nimbus", "MATCHING_AUTHENTICATED_RELEASE"],
  ])("%s produces %s", async (id, expected) => {
    const fixture = (await getDemoFixtures()).find((f) => f.id === id)!;
    const verdict = await verifyFixture(fixture);
    expect(verdict.status).toBe(expected);
    expect(verdict.trustSource).toBe("DEMO_FIXTURE");
  });

  it("repacked fixture is unregistered and signed by a non-registered key", async () => {
    const repack = (await getDemoFixtures()).find((f) => f.id === "fixture-repacked-aurora")!;
    expect(repack.releaseRecord).toBeUndefined();
    const verdict = await verifyFixture(repack);
    expect(verdict.signatureVerification.isValid).toBe(false);
  });

  it("verifies authentic fixture matches cleanly", async () => {
    const fixtures = await getDemoFixtures();
    const authentic = fixtures.find((f) => f.id === "fixture-authentic-aurora")!;

    const verdict = await verifyFileAgainstManifest({
      fileBytes: authentic.fileBytes,
      fileName: authentic.fileName,
      manifest: authentic.manifest,
      publisher: authentic.publisher,
      onChainRecord: authentic.releaseRecord,
    });

    expect(verdict.status).toBe("MATCHING_AUTHENTICATED_RELEASE");
    expect(verdict.fileIntegrity.status).toBe("MATCH");
    expect(verdict.signatureVerification.isValid).toBe(true);
  });

  it("verifies tampered fixture triggers HASH_MISMATCH", async () => {
    const fixtures = await getDemoFixtures();
    const tampered = fixtures.find((f) => f.id === "fixture-tampered-aurora")!;

    const verdict = await verifyFileAgainstManifest({
      fileBytes: tampered.fileBytes,
      fileName: tampered.fileName,
      manifest: tampered.manifest,
      publisher: tampered.publisher,
      onChainRecord: tampered.releaseRecord,
    });

    expect(verdict.status).toBe("HASH_MISMATCH");
    expect(verdict.fileIntegrity.status).toBe("MISMATCH");
  });
});
