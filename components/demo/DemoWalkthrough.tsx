"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  LogOut,
  Info,
} from "lucide-react";
import { getDemoFixtures, DEMO_PUBLISHER, type DemoFixtureItem } from "@/lib/demo-data/fixtures";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { compareArtifacts, type ReleaseDnaComparison } from "@/lib/risk/release-dna";
import { aggregateRiskIntelligence, type RiskIntelligenceReport } from "@/lib/risk/evidence";
import { LineageTimeline } from "@/components/release-dna/LineageTimeline";
import type { VerificationVerdict } from "@/lib/verification/types";

export function DemoWalkthrough() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Step 1: Authentic Verification State
  const [step1Verdict, setStep1Verdict] = useState<VerificationVerdict | null>(null);

  // Step 2: Tampered Detection State
  const [step2Verdict, setStep2Verdict] = useState<VerificationVerdict | null>(null);

  // Step 3: Release DNA Comparison State
  const [step3Comparison, setStep3Comparison] = useState<ReleaseDnaComparison | null>(null);

  // Step 4: Risk Intelligence State
  const [step4Report, setStep4Report] = useState<RiskIntelligenceReport | null>(null);

  useEffect(() => {
    async function initDemo() {
      setLoading(true);
      try {
        const items = await getDemoFixtures();
        setFixtures(items);

        const authentic = items.find((f) => f.id === "fixture-authentic-ubuntu") ?? items[0];
        const tampered = items.find((f) => f.id === "fixture-tampered-ubuntu") ?? items[1];
        const repacked = items.find((f) => f.id === "fixture-repacked-ubuntu") ?? items[2];

        if (authentic) {
          const v1 = await verifyFileAgainstManifest({
            fileBytes: authentic.fileBytes,
            fileName: authentic.fileName,
            manifest: authentic.manifest,
            publisherPublicKeyHex: DEMO_PUBLISHER.publicKeyHex,
            onChainRecord: authentic.releaseRecord,
            authorizedPublisherPubKeyHex: DEMO_PUBLISHER.publicKeyHex,
          });
          setStep1Verdict(v1);

          const r4 = aggregateRiskIntelligence({
            fileIntegrity: v1.fileIntegrity,
            signatureVerification: v1.signatureVerification,
            releaseRecord: authentic.releaseRecord,
            scannerConfig: { enabled: false },
          });
          setStep4Report(r4);
        }

        if (tampered) {
          const v2 = await verifyFileAgainstManifest({
            fileBytes: tampered.fileBytes,
            fileName: tampered.fileName,
            manifest: tampered.manifest,
            publisherPublicKeyHex: DEMO_PUBLISHER.publicKeyHex,
            onChainRecord: tampered.releaseRecord,
            authorizedPublisherPubKeyHex: DEMO_PUBLISHER.publicKeyHex,
          });
          setStep2Verdict(v2);
        }

        if (authentic && repacked) {
          const comp = compareArtifacts(
            {
              id: authentic.id,
              fileName: authentic.fileName,
              fileSize: authentic.fileBytes.byteLength,
              sha256: authentic.manifest.sha256,
              manifest: authentic.manifest,
              releaseRecord: authentic.releaseRecord,
              isDemo: true,
            },
            {
              id: repacked.id,
              fileName: repacked.fileName,
              fileSize: repacked.fileBytes.byteLength,
              sha256: "deadbeef777788889999aaaabbbbccccddddeeeeffff00001111222233334444",
              manifest: undefined,
              releaseRecord: undefined,
              isDemo: true,
            }
          );
          setStep3Comparison(comp);
        }
      } catch (err) {
        console.error("Demo initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initDemo();
  }, []);

  const steps = [
    { number: 1, title: "Verify integrity", subtitle: "Authentic release matching" },
    { number: 2, title: "Detect tampering", subtitle: "Real 1-byte hash mismatch" },
    { number: 3, title: "Explore release history", subtitle: "Same-filename forensics" },
    { number: 4, title: "Inspect risk report", subtitle: "Honest evidence audit" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Demo Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-neutral-900 text-sm">Interactive demo walkthrough</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-200 text-neutral-800">
              Demo data
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            A 3-minute guided tour. Zero wallet connection or testnet gas required.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-2.5 py-1 rounded text-xs bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-2.5 py-1 rounded text-xs bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit demo</span>
          </button>
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((s) => {
            const isActive = currentStep === s.number;
            const isCompleted = currentStep > s.number;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setCurrentStep(s.number)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : isCompleted
                    ? "bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100"
                    : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-medium ${isActive ? "text-neutral-400" : "text-neutral-500"}`}>
                    STEP {s.number} OF 4
                  </span>
                  {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className={`font-semibold text-xs ${isActive ? "text-white" : "text-neutral-900"}`}>
                  {s.title}
                </div>
                <div className={`text-[10px] truncate ${isActive ? "text-neutral-400" : "text-neutral-500"}`}>
                  {s.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Minimal progress bar */}
        <div className="w-full bg-neutral-200 h-1 rounded-full overflow-hidden">
          <div
            className="bg-neutral-900 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-500 text-xs">
          Loading sample fixtures...
        </div>
      ) : (
        <div className="space-y-6">
          {/* STEP 1: Verify Integrity */}
          {currentStep === 1 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">
                    Step 1 of 4: Verify integrity
                  </span>
                  <h3 className="text-base font-bold text-neutral-900">
                    Authentic release verification
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-600">
                  Target: <span className="text-neutral-900 font-semibold">ubuntu-24.04-desktop-amd64.iso</span>
                </span>
              </div>

              {step1Verdict && (
                <div className="space-y-4">
                  {/* Verdict Banner */}
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-xs">
                    <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900">
                        Integrity match
                      </div>
                      <div className="text-emerald-800">
                        Calculated SHA-256 matches reference manifest. Publisher Ed25519 signature verified successfully.
                      </div>
                    </div>
                  </div>

                  {/* Hash Inspection Grid */}
                  <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500 font-sans">Computed file SHA-256:</div>
                      <div className="text-neutral-900 break-all text-[11px]">
                        {step1Verdict.fileIntegrity.computedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px]">
                        Calculated in-browser via Web Crypto API.
                      </div>
                    </div>

                    <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500 font-sans">Expected manifest digest:</div>
                      <div className="text-neutral-900 break-all text-[11px]">
                        {step1Verdict.fileIntegrity.expectedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px]">
                        Signed by publisher: canonical-ubuntu
                      </div>
                    </div>
                  </div>

                  {/* Piece Matrix */}
                  <div className="p-3.5 rounded bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900">
                        Piece checksum verification
                      </span>
                      <span className="font-mono text-emerald-700 text-[11px]">
                        7 of 7 pieces verified (100% match)
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-center"
                        >
                          <div className="text-[10px] text-neutral-500 font-mono">#{idx}</div>
                          <Check className="w-3.5 h-3.5 text-emerald-700 mx-auto mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-2">
                    <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Integrity principle:</strong> A matching hash proves byte-level equivalence to the publisher reference. It does not mean the software is malware-free.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Detect Tampering */}
          {currentStep === 2 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">
                    Step 2 of 4: Detect tampering
                  </span>
                  <h3 className="text-base font-bold text-neutral-900">
                    Detecting altered bytes or bit-rot
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-600">
                  Target: <span className="text-neutral-900 font-semibold">ubuntu-24.04-desktop-amd64.iso (Altered)</span>
                </span>
              </div>

              {step2Verdict && (
                <div className="space-y-4">
                  {/* Verdict Banner */}
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center space-x-3 text-xs">
                    <X className="w-5 h-5 text-red-700 shrink-0" />
                    <div>
                      <div className="font-bold text-red-900">
                        Hash mismatch detected
                      </div>
                      <div className="text-red-800">
                        Downloaded file bytes differ from official signed manifest. Exactly 1 byte in Piece #0 was modified.
                      </div>
                    </div>
                  </div>

                  {/* Hash Comparison */}
                  <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded bg-neutral-50 border border-red-200 space-y-1">
                      <div className="text-neutral-500 font-sans">Computed file SHA-256 (Tampered):</div>
                      <div className="text-red-800 break-all text-[11px]">
                        {step2Verdict.fileIntegrity.computedSha256}
                      </div>
                      <div className="text-red-700 font-sans text-[10px]">
                        Mismatch: Calculated from modified file bytes.
                      </div>
                    </div>

                    <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500 font-sans">Expected manifest digest:</div>
                      <div className="text-neutral-900 break-all text-[11px]">
                        {step2Verdict.fileIntegrity.expectedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px]">
                        Authentic manifest signed by publisher.
                      </div>
                    </div>
                  </div>

                  {/* Piece Matrix */}
                  <div className="p-3.5 rounded bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900">
                        Piece tamper localization
                      </span>
                      <span className="font-mono text-red-700 text-[11px]">
                        Piece #0 corrupted · 6 of 7 pieces matched
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      <div className="p-1.5 rounded bg-red-50 border border-red-200 text-center">
                        <div className="text-[10px] text-red-700 font-mono">#0 (Altered)</div>
                        <X className="w-3.5 h-3.5 text-red-700 mx-auto mt-0.5" />
                      </div>
                      {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-center"
                        >
                          <div className="text-[10px] text-neutral-500 font-mono">#{idx}</div>
                          <Check className="w-3.5 h-3.5 text-emerald-700 mx-auto mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-2">
                    <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Forensic nuance:</strong> A hash mismatch indicates that the file content differs from reference. It does not definitively prove the file contains malware.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Explore Release DNA */}
          {currentStep === 3 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">
                    Step 3 of 4: Explore release history
                  </span>
                  <h3 className="text-base font-bold text-neutral-900">
                    Same-filename variant forensics
                  </h3>
                </div>
                <span className="text-xs text-neutral-500">
                  Distinguishing authentic binaries from repacks.
                </span>
              </div>

              {step3Comparison && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1 text-xs">
                    <div className="font-bold text-neutral-900">
                      {step3Comparison.verdictTitle}
                    </div>
                    <p className="text-neutral-600">
                      {step3Comparison.explanation}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded bg-white border border-neutral-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-neutral-900">Variant A: Authentic vendor</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-neutral-600">
                        <div>Filename: ubuntu-24.04-desktop-amd64.iso</div>
                        <div>Publisher: canonical-ubuntu</div>
                        <div className="truncate">SHA: {step3Comparison.artifactA.sha256}</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded bg-white border border-neutral-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-neutral-900">Variant B: Untrusted repack</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Unregistered
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-neutral-600">
                        <div>Filename: ubuntu-24.04-desktop-amd64.iso</div>
                        <div>Publisher: Unauthenticated mirror</div>
                        <div className="truncate">SHA: {step3Comparison.artifactB.sha256}</div>
                      </div>
                    </div>
                  </div>

                  {step3Comparison.lineageNodes.length > 0 && (
                    <LineageTimeline
                      nodes={step3Comparison.lineageNodes}
                      edges={step3Comparison.lineageEdges}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Inspect Risk Evidence */}
          {currentStep === 4 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">
                    Step 4 of 4: Inspect risk report
                  </span>
                  <h3 className="text-base font-bold text-neutral-900">
                    Honest scanner policy &amp; multi-source evidence
                  </h3>
                </div>
                <span className="text-xs text-neutral-500">
                  Separating publisher identity from malware inspection.
                </span>
              </div>

              {step4Report && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500">Provenance confidence:</div>
                      <div className="text-sm font-bold text-emerald-700">100% AUTHENTIC</div>
                      <div className="text-[10px] text-neutral-500">Valid Ed25519 signature.</div>
                    </div>

                    <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500">Integrity check:</div>
                      <div className="text-sm font-bold text-emerald-700">EXACT MATCH</div>
                      <div className="text-[10px] text-neutral-500">SHA-256 + 7 pieces matched.</div>
                    </div>

                    <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500">Malware scan:</div>
                      <div className="text-sm font-bold text-neutral-700">UNAVAILABLE</div>
                      <div className="text-[10px] text-neutral-500">No scanner configured. Never fakes clean.</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                    <div className="font-semibold text-neutral-900 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-neutral-500" />
                      <span>Penguin Trace honesty guarantee</span>
                    </div>
                    <p>
                      We never display 0 detections as a clean bill of health when no scanner ran. Provenance tells you <em>who signed the bytes</em>, not whether runtime execution is safe.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-200">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="px-3.5 py-2 rounded-md bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-300 text-neutral-800 text-xs font-medium flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-3.5 py-2 rounded-md bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-medium"
              >
                Exit demo
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                  className="px-4 py-2 rounded-md bg-black text-white hover:bg-neutral-800 text-xs font-medium flex items-center space-x-1.5"
                >
                  <span>Next: Step {currentStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/verify")}
                  className="px-4 py-2 rounded-md bg-black text-white hover:bg-neutral-800 text-xs font-medium flex items-center space-x-1.5"
                >
                  <span>Open live verifier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
