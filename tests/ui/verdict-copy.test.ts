import { describe, it, expect } from "vitest";
import { getDemoFixtures } from "@/lib/demo-data/fixtures";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { describeVerdict } from "@/lib/ui/verdict-copy";

async function copyFor(id: string) {
  const f = (await getDemoFixtures()).find((x) => x.id === id)!;
  const v = await verifyFileAgainstManifest({
    fileBytes: f.fileBytes,
    fileName: f.fileName,
    manifest: f.manifest,
    publisher: f.publisher,
    onChainRecord: f.releaseRecord,
    trustSource: "DEMO_FIXTURE",
  });
  return describeVerdict(v);
}

describe("plain-language verdicts", () => {
  it.each([
    ["fixture-authentic-aurora", "good", "This file is genuine"],
    ["fixture-tampered-aurora", "bad", "This file has been changed"],
    ["fixture-repacked-aurora", "bad", "The signature isn't real"],
    ["fixture-revoked-nimbus", "bad", "The publisher withdrew this release"],
    ["fixture-superseded-nimbus", "warn", "Genuine, but out of date"],
  ])("%s → %s: %s", async (id, tone, title) => {
    const copy = await copyFor(id);
    expect(copy.tone).toBe(tone);
    expect(copy.title).toBe(title);
  });

  it("never tells the user a file 'matches' when the signature can't be trusted", async () => {
    const copy = await copyFor("fixture-repacked-aurora");
    const fileCheck = copy.checks.find((c) => c.label === "File matches the publisher's release")!;
    expect(fileCheck.tone).not.toBe("good");
  });

  it("always states that no virus scan was done", async () => {
    const copy = await copyFor("fixture-authentic-aurora");
    expect(copy.checks.find((c) => c.label === "Virus scan")?.tone).toBe("neutral");
  });
});
