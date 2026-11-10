"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { getDemoFixtures } from "@/lib/demo-data/fixtures";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import type { VerificationVerdict } from "@/lib/verification/types";
import { VerdictCard } from "@/components/verification/VerdictCard";

const STEPS = [
  {
    fixture: "fixture-authentic-aurora",
    title: "A genuine download",
    story:
      "You downloaded Aurora Linux and its signature file from the official site. Penguin Trace checks the file against the publisher's registered signature.",
  },
  {
    fixture: "fixture-tampered-aurora",
    title: "A tampered download",
    story:
      "Same file name and the same real signature file, but a single byte of the download was changed along the way, by a broken mirror or an attacker.",
  },
  {
    fixture: "fixture-repacked-aurora",
    title: "A fake with the same name",
    story:
      "Someone repackaged the file and wrote their own signature file claiming to be the Aurora publisher. The file matches their signature, but their signature doesn't match the publisher's real key.",
  },
  {
    fixture: "fixture-revoked-nimbus",
    title: "A withdrawn release",
    story:
      "This file is genuine, but after release the publisher found a serious problem and withdrew it. Everyone who checks it is told not to use it.",
  },
];

/** A short guided story: four downloads, four answers — using the same result card as the real check. */
export function DemoWalkthrough() {
  const [verdicts, setVerdicts] = useState<Record<string, VerificationVerdict>>({});
  const [step, setStep] = useState(0);

  useEffect(() => {
    (async () => {
      const fixtures = await getDemoFixtures();
      const entries = await Promise.all(
        STEPS.map(async (s) => {
          const f = fixtures.find((x) => x.id === s.fixture)!;
          const v = await verifyFileAgainstManifest({
            fileBytes: f.fileBytes,
            fileName: f.fileName,
            manifest: f.manifest,
            publisher: f.publisher,
            onChainRecord: f.releaseRecord,
            trustSource: "DEMO_FIXTURE",
          });
          return [s.fixture, v] as const;
        })
      );
      setVerdicts(Object.fromEntries(entries));
    })();
  }, []);

  const current = STEPS[step];
  const verdict = verdicts[current.fixture];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-2">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">See how it works</h1>
        <p className="text-base text-neutral-600">
          Four downloads, four answers. These use made-up sample files, so you don&apos;t need anything installed.
        </p>
      </div>

      {/* Progress */}
      <ol className="flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s.fixture} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`w-full h-1.5 rounded-full transition-colors ${i <= step ? "bg-neutral-950" : "bg-neutral-200"}`}
              aria-label={`Step ${i + 1}: ${s.title}`}
            />
          </li>
        ))}
      </ol>

      <div className="space-y-3">
        <div className="text-sm text-neutral-500">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950">{current.title}</h2>
        <p className="text-base text-neutral-700 leading-relaxed">{current.story}</p>
      </div>

      {verdict ? (
        <VerdictCard verdict={verdict} />
      ) : (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <RefreshCw className="w-4 h-4 animate-spin" /> Checking sample...
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {isLast ? (
          <Link
            href="/verify"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            <ShieldCheck className="w-4 h-4" />
            Check your own file
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
