import { describe, it, expect } from "vitest";
import { getDemoFixtures, DEMO_PUBLISHER } from "@/lib/demo-data/fixtures";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";

describe("Demo Data Fixtures", () => {
  it("provides 5 cryptographically valid labeled fixtures", async () => {
    const fixtures = await getDemoFixtures();
    expect(fixtures).toHaveLength(5);

    for (const f of fixtures) {
      expect(f.demoOnly).toBe(true);
      expect(f.manifest.schemaVersion).toBe("1.0.0");
      expect(f.releaseRecord).toBeDefined();
    }
  });

  it("verifies authentic fixture matches cleanly", async () => {
    const fixtures = await getDemoFixtures();
    const authentic = fixtures.find((f) => f.id === "fixture-authentic-ubuntu")!;

    const verdict = await verifyFileAgainstManifest({
      fileBytes: authentic.fileBytes,
      fileName: authentic.fileName,
      manifest: authentic.manifest,
      publisherPublicKeyHex: DEMO_PUBLISHER.publicKeyHex,
      onChainRecord: authentic.releaseRecord,
    });

    expect(verdict.status).toBe("MATCHING_AUTHENTICATED_RELEASE");
    expect(verdict.fileIntegrity.status).toBe("MATCH");
    expect(verdict.signatureVerification.isValid).toBe(true);
  });

  it("verifies tampered fixture triggers HASH_MISMATCH", async () => {
    const fixtures = await getDemoFixtures();
    const tampered = fixtures.find((f) => f.id === "fixture-tampered-ubuntu")!;

    const verdict = await verifyFileAgainstManifest({
      fileBytes: tampered.fileBytes,
      fileName: tampered.fileName,
      manifest: tampered.manifest,
      publisherPublicKeyHex: DEMO_PUBLISHER.publicKeyHex,
      onChainRecord: tampered.releaseRecord,
    });

    expect(verdict.status).toBe("HASH_MISMATCH");
    expect(verdict.fileIntegrity.status).toBe("MISMATCH");
  });
});
