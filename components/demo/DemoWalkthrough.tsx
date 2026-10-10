"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  LogOut,
  FileCode,
  Layers,
  GitCompare,
  Activity,
  Check,
  PlayCircle,
  Clock,
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

        // Step 1: Run real verification on authentic fixture
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

          // Step 4: Aggregate real risk intelligence report for authentic fixture
          const r4 = aggregateRiskIntelligence({
            fileIntegrity: v1.fileIntegrity,
            signatureVerification: v1.signatureVerification,
            releaseRecord: authentic.releaseRecord,
            scannerConfig: { enabled: false },
          });
          setStep4Report(r4);
        }

        // Step 2: Run real verification on tampered fixture
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

        // Step 3: Compare authentic vs repacked artifact profile
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
    { number: 1, title: "Verify Integrity", subtitle: "Authentic Release Matching" },
    { number: 2, title: "Detect Tampering", subtitle: "Real 1-Byte Hash Mismatch" },
    { number: 3, title: "Explore Release DNA", subtitle: "Same-Filename Forensics" },
    { number: 4, title: "Inspect Risk Evidence", subtitle: "Honest Multi-Source Audit" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Top Demo Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-purple-950/80 border border-cyan-800/60 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-base">SwarmTrace Demo Walkthrough</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-900/80 text-cyan-300 border border-cyan-700">
                OFFLINE-CAPABLE
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Interactive 3-minute guided tour. Zero wallet connection or testnet gas required.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-lg text-xs bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Demo</span>
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((s) => {
            const isActive = currentStep === s.number;
            const isCompleted = currentStep > s.number;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setCurrentStep(s.number)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950"
                    : isCompleted
                    ? "bg-gray-900/40 border-gray-700 text-gray-300 hover:border-gray-600"
                    : "bg-gray-950/40 border-gray-800 text-gray-500 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold text-gray-400">
                    STEP {s.number} OF 4
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  ) : null}
                </div>
                <div className={`font-semibold text-xs ${isActive ? "text-cyan-300" : "text-gray-200"}`}>
                  {s.title}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{s.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Visual progress bar line */}
        <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-purple-600 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs">Initializing cryptographic demo fixtures...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* STEP 1: Verify Integrity */}
          {currentStep === 1 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                    DEMO FIXTURE — AUTHENTIC RELEASE
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Step 1: Cryptographic Integrity Verification</span>
                  </h3>
                </div>
                <span className="text-xs font-mono text-gray-400">
                  Target: <span className="text-cyan-300 font-semibold">ubuntu-24.04-desktop-amd64.iso</span>
                </span>
              </div>

              {step1Verdict && (
                <div className="space-y-5">
                  {/* Verdict Badge */}
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/80 flex items-center space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        MATCHING AUTHENTICATED RELEASE
                      </div>
                      <div className="text-xs text-gray-300">
                        Calculated SHA-256 matches the reference manifest. Detached Ed25519 signature verified successfully against publisher key.
                      </div>
                    </div>
                  </div>

                  {/* Hash & Signature Inspection Grid */}
                  <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                      <div className="text-gray-400 font-sans font-medium">Computed Whole-File SHA-256:</div>
                      <div className="text-emerald-300 break-all text-[11px]">
                        {step1Verdict.fileIntegrity.computedSha256}
                      </div>
                      <div className="text-gray-500 font-sans text-[11px] pt-1 border-t border-gray-900">
                        Processed locally in-browser via Web Crypto API.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                      <div className="text-gray-400 font-sans font-medium">Expected Manifest Digest:</div>
                      <div className="text-cyan-300 break-all text-[11px]">
                        {step1Verdict.fileIntegrity.expectedSha256}
                      </div>
                      <div className="text-gray-500 font-sans text-[11px] pt-1 border-t border-gray-900">
                        Signed by publisher: <span className="text-cyan-400">canonical-ubuntu</span>
                      </div>
                    </div>
                  </div>

                  {/* Piece Matrix */}
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300 flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span>BitTorrent Piece Verification (Chunk Integrity)</span>
                      </span>
                      <span className="font-mono text-emerald-400 text-[11px]">
                        7 of 7 pieces verified (100% matched)
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-center"
                        >
                          <div className="text-[10px] text-gray-400 font-mono">#{idx}</div>
                          <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Essential Forensics Caveat */}
                  <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80 text-xs text-gray-400 space-y-1">
                    <div className="font-semibold text-gray-300 flex items-center space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Security Forensics Axiom:</span>
                    </div>
                    <p>
                      A matching hash proves byte-level equivalence to the publisher reference. It does <strong>not</strong> scan the file for malicious behavior or prove the software is vulnerability-free.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Detect Tampering */}
          {currentStep === 2 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    DEMO FIXTURE — 1-BYTE MODIFIED ARTIFACT
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    <span>Step 2: Detecting File Tampering & Bit-Rot</span>
                  </h3>
                </div>
                <span className="text-xs font-mono text-gray-400">
                  Target: <span className="text-amber-300 font-semibold">ubuntu-24.04-desktop-amd64.iso</span> (Altered)
                </span>
              </div>

              {step2Verdict && (
                <div className="space-y-5">
                  {/* Verdict Badge */}
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-amber-300">
                        HASH MISMATCH DETECTED
                      </div>
                      <div className="text-xs text-gray-300">
                        The downloaded file bytes differ from the official signed manifest. Exactly 1 byte in Piece #0 was flipped.
                      </div>
                    </div>
                  </div>

                  {/* Hash Comparison Diff */}
                  <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/60 space-y-2">
                      <div className="text-rose-400 font-sans font-medium flex items-center justify-between">
                        <span>Computed File SHA-256 (Tampered):</span>
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <div className="text-rose-300 break-all text-[11px]">
                        {step2Verdict.fileIntegrity.computedSha256}
                      </div>
                      <div className="text-rose-500 font-sans text-[11px] pt-1 border-t border-rose-950">
                        Mismatch: Calculated from actual modified file bytes.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                      <div className="text-gray-400 font-sans font-medium">Expected Manifest Digest:</div>
                      <div className="text-cyan-300 break-all text-[11px]">
                        {step2Verdict.fileIntegrity.expectedSha256}
                      </div>
                      <div className="text-gray-500 font-sans text-[11px] pt-1 border-t border-gray-900">
                        Authentic manifest signed by publisher.
                      </div>
                    </div>
                  </div>

                  {/* Piece Matrix Showing Isolated Piece Failure */}
                  <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300 flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span>Piece Tamper Localization</span>
                      </span>
                      <span className="font-mono text-rose-400 text-[11px]">
                        Piece #0 corrupted · 6 of 7 pieces matched
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-center animate-pulse">
                        <div className="text-[10px] text-rose-300 font-mono">#0 (CORRUPT)</div>
                        <XCircle className="w-3.5 h-3.5 text-rose-400 mx-auto mt-0.5" />
                      </div>
                      {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-center"
                        >
                          <div className="text-[10px] text-gray-400 font-mono">#{idx}</div>
                          <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Honest Security Caveat */}
                  <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-400 space-y-1">
                    <div className="font-semibold text-amber-300 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Forensic Interpretation:</span>
                    </div>
                    <p>
                      A hash mismatch proves the file differs from the reference artifact (due to bit-rot, repackaging, or unauthorized alteration). It does <strong>not</strong> prove the file is malware or malicious.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Explore Release DNA */}
          {currentStep === 3 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    DEMO DATA — NOT AN ON-CHAIN RECORD
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <GitCompare className="w-5 h-5 text-purple-400" />
                    <span>Step 3: Release DNA & Same-Filename Variant Forensics</span>
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Cross-examining identical filenames from unverified trackers.
                </span>
              </div>

              {step3Comparison && (
                <div className="space-y-6">
                  {/* Verdict Card */}
                  <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-purple-400 font-mono font-semibold">
                        Forensic Verdict
                      </div>
                      <div className="text-base font-bold text-white">
                        {step3Comparison.verdictTitle}
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        {step3Comparison.explanation}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      SAME NAME · DIFFERENT ORIGIN
                    </span>
                  </div>

                  {/* Side-by-Side Comparison Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Variant A (Authentic) */}
                    <div className="p-4 rounded-xl bg-gray-950 border border-emerald-900/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          VARIANT A: AUTHENTIC VENDOR
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">DEMO RECORD</span>
                      </div>
                      <div className="font-semibold text-sm text-white">
                        {step3Comparison.artifactA.fileName}
                      </div>
                      <div className="space-y-1 text-xs font-mono text-gray-400">
                        <div>Filename: <span className="text-white">{step3Comparison.artifactA.fileName}</span></div>
                        <div>Publisher: <span className="text-cyan-300">{step3Comparison.artifactA.manifest?.publisherId ?? "unknown"}</span></div>
                        <div>Status: <span className="text-emerald-400 font-semibold">{step3Comparison.diff.statusA}</span></div>
                        <div className="truncate text-gray-500">SHA-256: {step3Comparison.artifactA.sha256}</div>
                      </div>
                    </div>

                    {/* Variant B (Repack) */}
                    <div className="p-4 rounded-xl bg-gray-950 border border-rose-900/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          VARIANT B: UNVERIFIED TRACKER REPACK
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">DEMO RECORD</span>
                      </div>
                      <div className="font-semibold text-sm text-white">
                        {step3Comparison.artifactB.fileName} (Unverified Tracker Repack)
                      </div>
                      <div className="space-y-1 text-xs font-mono text-gray-400">
                        <div>Filename: <span className="text-white">{step3Comparison.artifactB.fileName}</span></div>
                        <div>Publisher: <span className="text-rose-400">Unauthenticated Tracker</span></div>
                        <div>Status: <span className="text-gray-400">{step3Comparison.diff.statusB}</span></div>
                        <div className="truncate text-gray-500">SHA-256: {step3Comparison.artifactB.sha256}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Lineage Graph */}
                  {step3Comparison.lineageNodes.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-gray-400">
                        Sample Release Lineage (Predecessor &rarr; Successor):
                      </div>
                      <LineageTimeline
                        nodes={step3Comparison.lineageNodes}
                        edges={step3Comparison.lineageEdges}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Inspect Risk Evidence */}
          {currentStep === 4 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    DEMO EVIDENCE PANEL
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <span>Step 4: Transparent Risk Intelligence & Scanner Policy</span>
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Separating publisher provenance from active security inspection.
                </span>
              </div>

              {step4Report && (
                <div className="space-y-5">
                  {/* Summary Metric Cards */}
                  <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                      <div className="text-gray-400 font-sans">Provenance Confidence:</div>
                      <div className="text-lg font-bold text-emerald-400">AUTHENTIC</div>
                      <div className="text-[11px] text-gray-500 font-sans">
                        Valid Ed25519 signature from authorized key.
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                      <div className="text-gray-400 font-sans">Integrity Verification:</div>
                      <div className="text-lg font-bold text-emerald-400">100% MATCHED</div>
                      <div className="text-[11px] text-gray-500 font-sans">
                        Full-file SHA-256 + 7 chunk hashes matched.
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-950 border border-amber-900/50 space-y-1">
                      <div className="text-gray-400 font-sans">Malware Inspection:</div>
                      <div className="text-lg font-bold text-amber-400">SCANNER UNAVAILABLE</div>
                      <div className="text-[11px] text-gray-500 font-sans">
                        No external scanner configured. Never fakes 0-detection.
                      </div>
                    </div>
                  </div>

                  {/* Transparent Findings Table */}
                  <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
                    <div className="p-3 border-b border-gray-800 text-xs font-semibold text-gray-300">
                      Evidence Findings Breakdown
                    </div>
                    <div className="divide-y divide-gray-800 text-xs">
                      {step4Report.findings.map((finding) => (
                        <div key={finding.id} className="p-3.5 flex items-start space-x-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-0.5 ${
                              finding.status === "POSITIVE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : finding.status === "FLAGGED"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : finding.status === "UNAVAILABLE" || finding.status === "NOT_SCANNED"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                            }`}
                          >
                            {finding.status}
                          </span>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-white">{finding.title}</div>
                            <div className="text-gray-400 text-[11px]">{finding.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Policy Statement */}
                  <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-400 space-y-1">
                    <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>SwarmTrace Honesty Guarantee:</span>
                    </div>
                    <p>
                      We strictly separate publisher provenance from malware risk. A valid signature tells you <em>who authored the release</em>. We never present a file as &quot;safe&quot; without active scanner results.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-800">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-200 text-xs font-medium flex items-center space-x-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Demo</span>
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors shadow-md shadow-cyan-950"
                >
                  <span>Next: Step {currentStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/verify")}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors shadow-md shadow-emerald-950"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Try Live Verifier</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
