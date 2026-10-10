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
  Layers,
  Copy,
  CheckCheck,
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 1: Authentic Verification State
  const [step1Verdict, setStep1Verdict] = useState<VerificationVerdict | null>(null);

  // Step 2: Tampered Detection State
  const [step2Verdict, setStep2Verdict] = useState<VerificationVerdict | null>(null);

  // Step 3: Release DNA Comparison State
  const [step3Comparison, setStep3Comparison] = useState<ReleaseDnaComparison | null>(null);

  // Step 4: Risk Intelligence State
  const [step4Report, setStep4Report] = useState<RiskIntelligenceReport | null>(null);

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

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
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-neutral-950 text-white border border-neutral-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="font-bold text-sm tracking-tight">Interactive Demo Walkthrough</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700 font-semibold">
              Demo Data Fixtures
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            A 3-minute guided tour. Zero wallet connection, API keys, or testnet gas required.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-3 py-1.5 rounded-md text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-md text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit demo</span>
          </button>
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {steps.map((s) => {
            const isActive = currentStep === s.number;
            const isCompleted = currentStep > s.number;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setCurrentStep(s.number)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                    : isCompleted
                    ? "bg-neutral-50 border-neutral-200 text-neutral-900 hover:bg-neutral-100"
                    : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      isActive ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    STEP {s.number} OF 4
                  </span>
                  {isCompleted && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className={`font-bold text-xs ${isActive ? "text-white" : "text-neutral-950"}`}>
                  {s.title}
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${
                    isActive ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {s.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Minimal progress bar */}
        <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-neutral-950 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-500 text-xs font-mono">
          Loading sample fixtures...
        </div>
      ) : (
        <div className="space-y-6">
          {/* STEP 1: Verify Integrity */}
          {currentStep === 1 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    Step 1 of 4: Verify Integrity
                  </span>
                  <h3 className="text-base font-bold text-neutral-950">
                    Authentic Release Verification
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-600">
                  Target: <span className="text-neutral-950 font-bold">ubuntu-24.04-desktop-amd64.iso</span>
                </span>
              </div>

              {step1Verdict && (
                <div className="space-y-5">
                  {/* Verdict Banner */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center space-x-3 text-xs shadow-sm">
                    <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-950 text-sm">
                        Integrity match
                      </div>
                      <div className="text-emerald-900 leading-relaxed font-medium">
                        Calculated SHA-256 matches reference manifest. Publisher Ed25519 signature verified successfully.
                      </div>
                    </div>
                  </div>

                  {/* Hash Inspection Grid */}
                  <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3.5 rounded-lg bg-neutral-950 text-white border border-neutral-800 space-y-1.5">
                      <div className="text-neutral-400 font-sans text-[11px]">Computed file SHA-256:</div>
                      <div className="text-emerald-400 break-all text-[11px]">
                        {step1Verdict.fileIntegrity.computedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px] pt-1 border-t border-neutral-900">
                        Calculated in Web Crypto API
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-neutral-950 text-white border border-neutral-800 space-y-1.5">
                      <div className="text-neutral-400 font-sans text-[11px]">Expected manifest digest:</div>
                      <div className="text-neutral-200 break-all text-[11px]">
                        {step1Verdict.fileIntegrity.expectedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px] pt-1 border-t border-neutral-900">
                        Signed by: canonical-ubuntu
                      </div>
                    </div>
                  </div>

                  {/* Piece Matrix */}
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-950 font-mono text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Piece Checksum Verification</span>
                      </span>
                      <span className="font-mono text-emerald-800 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        7 of 7 pieces verified (100% match)
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center"
                        >
                          <div className="text-[10px] text-neutral-500 font-mono">#{idx}</div>
                          <Check className="w-3.5 h-3.5 text-emerald-700 mx-auto mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-neutral-50 border-l-4 border-l-neutral-950 border border-neutral-200 text-xs text-neutral-700 flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
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
            <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    Step 2 of 4: Detect Tampering
                  </span>
                  <h3 className="text-base font-bold text-neutral-950">
                    Detecting Altered Bytes or Bit-Rot
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-600">
                  Target: <span className="text-neutral-950 font-bold">ubuntu-24.04-desktop-amd64.iso (Altered)</span>
                </span>
              </div>

              {step2Verdict && (
                <div className="space-y-5">
                  {/* Verdict Banner */}
                  <div className="p-4 rounded-xl bg-red-50 border border-red-300 flex items-center space-x-3 text-xs shadow-sm">
                    <X className="w-5 h-5 text-red-700 shrink-0" />
                    <div>
                      <div className="font-bold text-red-950 text-sm">
                        Hash mismatch detected
                      </div>
                      <div className="text-red-900 leading-relaxed font-medium">
                        Downloaded file bytes differ from official signed manifest. Exactly 1 byte in Piece #0 was modified.
                      </div>
                    </div>
                  </div>

                  {/* Hash Comparison */}
                  <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3.5 rounded-lg bg-neutral-950 text-white border border-neutral-800 space-y-1.5">
                      <div className="text-red-400 font-sans text-[11px] font-medium">Computed file SHA-256 (Tampered):</div>
                      <div className="text-red-400 break-all text-[11px]">
                        {step2Verdict.fileIntegrity.computedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px] pt-1 border-t border-neutral-900">
                        Mismatch: Calculated from modified file bytes
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-neutral-950 text-white border border-neutral-800 space-y-1.5">
                      <div className="text-neutral-400 font-sans text-[11px]">Expected manifest digest:</div>
                      <div className="text-neutral-200 break-all text-[11px]">
                        {step2Verdict.fileIntegrity.expectedSha256}
                      </div>
                      <div className="text-neutral-500 font-sans text-[10px] pt-1 border-t border-neutral-900">
                        Authentic manifest signed by publisher
                      </div>
                    </div>
                  </div>

                  {/* Piece Matrix */}
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-950 font-mono text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Piece Tamper Localization</span>
                      </span>
                      <span className="font-mono text-red-800 font-bold text-[11px] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Piece #0 corrupted · 6 of 7 pieces matched
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      <div className="p-2 rounded-lg bg-red-50 border border-red-300 text-center">
                        <div className="text-[10px] text-red-900 font-mono font-bold">#0 (Altered)</div>
                        <X className="w-3.5 h-3.5 text-red-700 mx-auto mt-0.5" />
                      </div>
                      {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center"
                        >
                          <div className="text-[10px] text-neutral-500 font-mono">#{idx}</div>
                          <Check className="w-3.5 h-3.5 text-emerald-700 mx-auto mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-neutral-50 border-l-4 border-l-neutral-950 border border-neutral-200 text-xs text-neutral-700 flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
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
            <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    Step 3 of 4: Explore Release History
                  </span>
                  <h3 className="text-base font-bold text-neutral-950">
                    Same-Filename Variant Forensics
                  </h3>
                </div>
                <span className="text-xs text-neutral-500">
                  Distinguishing authentic binaries from repacks.
                </span>
              </div>

              {step3Comparison && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-xs shadow-sm">
                    <div className="font-bold text-neutral-950 text-sm">
                      {step3Comparison.verdictTitle}
                    </div>
                    <p className="text-neutral-700 leading-relaxed font-medium">
                      {step3Comparison.explanation}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-white border border-neutral-200 space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                        <span className="font-bold text-neutral-950">Variant A: Authentic vendor</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-neutral-700">
                        <div>Filename: ubuntu-24.04-desktop-amd64.iso</div>
                        <div>Publisher: canonical-ubuntu</div>
                        <div className="truncate text-neutral-500">SHA: {step3Comparison.artifactA.sha256}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-neutral-200 space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                        <span className="font-bold text-neutral-950">Variant B: Untrusted repack</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                          Unregistered
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-neutral-700">
                        <div>Filename: ubuntu-24.04-desktop-amd64.iso</div>
                        <div>Publisher: Unauthenticated mirror</div>
                        <div className="truncate text-neutral-500">SHA: {step3Comparison.artifactB.sha256}</div>
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
            <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    Step 4 of 4: Inspect Risk Report
                  </span>
                  <h3 className="text-base font-bold text-neutral-950">
                    Honest Scanner Policy &amp; Multi-Source Evidence
                  </h3>
                </div>
                <span className="text-xs text-neutral-500">
                  Separating publisher identity from malware inspection.
                </span>
              </div>

              {step4Report && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500 font-mono text-[10px] uppercase">Provenance Confidence:</div>
                      <div className="text-base font-bold text-emerald-800">100% AUTHENTIC</div>
                      <div className="text-[10px] text-neutral-600">Valid Ed25519 signature verified.</div>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500 font-mono text-[10px] uppercase">Integrity Check:</div>
                      <div className="text-base font-bold text-emerald-800">EXACT MATCH</div>
                      <div className="text-[10px] text-neutral-600">SHA-256 + 7 pieces matched.</div>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                      <div className="text-neutral-500 font-mono text-[10px] uppercase">Malware Scan:</div>
                      <div className="text-base font-bold text-neutral-800">UNAVAILABLE</div>
                      <div className="text-[10px] text-neutral-600">No scanner configured. Never fakes clean.</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border-l-4 border-l-neutral-950 border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 space-y-1">
                    <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-neutral-700" />
                      <span>Penguin Trace Honesty Guarantee</span>
                    </div>
                    <p className="leading-relaxed">
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
              className="px-4 py-2.5 rounded-lg bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-300 text-neutral-900 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-4 py-2.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-medium transition-all"
              >
                Exit demo
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                  className="px-5 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <span>Next: Step {currentStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/verify")}
                  className="px-5 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
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
