"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  Info,
  HelpCircle,
  Sliders,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import {
  aggregateRiskIntelligence,
  type RiskIntelligenceReport,
} from "@/lib/risk/evidence";
import { getDemoFixtures, type DemoFixtureItem } from "@/lib/demo-data/fixtures";
import { parseAndValidateManifest } from "@/lib/manifests/manifest";
import { resolveRegistryTrustAnchors } from "@/lib/chain/contract";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { hashFile } from "@/lib/crypto/hash-file";
import type { EvidenceFinding } from "@/lib/verification/types";

export function EvidencePanel() {
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("fixture-authentic-aurora");
  const [simulateScannerThreat, setSimulateScannerThreat] = useState<boolean>(false);
  const [report, setReport] = useState<RiskIntelligenceReport | null>(null);

  // Custom artifact evaluation state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customManifestText, setCustomManifestText] = useState<string>("");
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const items = await getDemoFixtures();
      setFixtures(items);
      await evaluateFixture("fixture-authentic-aurora", items, false);
    }
    load();
  }, []);

  async function evaluateFixture(
    fixtureId: string,
    items = fixtures,
    threatSimulated = simulateScannerThreat
  ) {
    setSelectedFixtureId(fixtureId);
    const fixture = items.find((f) => f.id === fixtureId);
    if (!fixture) return;

    // Run the real verification engine against the demo registry, so the report
    // reflects actual signature / hash / registry results for each fixture.
    const verdict = await verifyFileAgainstManifest({
      fileBytes: fixture.fileBytes,
      fileName: fixture.fileName,
      manifest: fixture.manifest,
      publisher: fixture.publisher,
      onChainRecord: fixture.releaseRecord,
      trustSource: "DEMO_FIXTURE",
    });

    const externalFindings: EvidenceFinding[] = [];
    if (threatSimulated) {
      externalFindings.push({
        id: "simulated-scanner-finding",
        sourceId: "virustotal-community-heuristics",
        sourceType: "STATIC_SCANNER",
        title: "Simulated Scanner Finding: Suspicious Heuristic Trigger",
        description:
          "Static analysis flagged suspicious obfuscated payload pattern (SIMULATED TEST VECTOR).",
        status: "FLAGGED",
        observedAt: Date.now(),
        isStale: false,
        demoOnly: true,
      });
    }

    const calculatedReport = aggregateRiskIntelligence({
      fileIntegrity: verdict.fileIntegrity,
      signatureVerification: verdict.signatureVerification,
      releaseRecord: verdict.releaseRecord,
      trustSource: "DEMO_FIXTURE",
      scannerConfig: threatSimulated ? { enabled: true, apiKey: "demo_mock_key" } : undefined,
      externalFindings: threatSimulated ? externalFindings : undefined,
    });

    setReport(calculatedReport);
  }

  async function handleEvaluateCustomArtifact(e: React.FormEvent) {
    e.preventDefault();
    if (!customFile || !customManifestText.trim()) {
      setCustomError("Please select the downloaded file and paste its signed release manifest.");
      return;
    }

    setIsEvaluatingCustom(true);
    setCustomError(null);

    try {
      const parsed = await parseAndValidateManifest(customManifestText);
      if (!parsed.valid) {
        setCustomError(`Manifest validation error: ${parsed.message}`);
        return;
      }

      // Publisher key and release record come only from the Monad registry.
      const anchors = await resolveRegistryTrustAnchors(parsed.manifest, parsed.manifestDigest);
      const chunkSize = Number.isSafeInteger(parsed.manifest.chunkSize) ? parsed.manifest.chunkSize : undefined;
      const verdict = await verifyFileAgainstManifest({
        fileDigest: await hashFile(customFile, { chunkSize }),
        fileName: customFile.name,
        manifest: parsed.manifest,
        publisher: anchors.publisher,
        onChainRecord: anchors.releaseRecord,
        networkError: anchors.networkError,
        trustSource: "MONAD_TESTNET",
      });

      const calculatedReport = aggregateRiskIntelligence({
        fileIntegrity: verdict.fileIntegrity,
        signatureVerification: verdict.signatureVerification,
        releaseRecord: verdict.releaseRecord,
        trustSource: "MONAD_TESTNET",
      });

      setReport(calculatedReport);
    } catch (err: any) {
      setCustomError(err.message || "Failed to evaluate artifact risk intelligence.");
    } finally {
      setIsEvaluatingCustom(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-neutral-200 space-x-2">
        <button
          type="button"
          onClick={() => {
            setMode("demo");
            void evaluateFixture("fixture-authentic-aurora");
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            mode === "demo"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          Sample fixtures &amp; threat simulations
        </button>

        <button
          type="button"
          onClick={() => setMode("live")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            mode === "live"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          Evaluate downloaded file
        </button>
      </div>

      {/* Demo Selector */}
      {mode === "demo" && (
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Select Sample Artifact:
            </span>
            <label className="text-xs text-neutral-800 flex items-center space-x-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={simulateScannerThreat}
                onChange={(e) => {
                  setSimulateScannerThreat(e.target.checked);
                  void evaluateFixture(selectedFixtureId, fixtures, e.target.checked);
                }}
                className="rounded border-neutral-400 text-neutral-950 focus:ring-neutral-950"
              />
              <span>Simulate external scanner alert (Demo finding)</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {fixtures.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => void evaluateFixture(f.id, fixtures, simulateScannerThreat)}
                className={`px-3 py-1.5 rounded text-xs transition-all ${
                  selectedFixtureId === f.id
                    ? "bg-neutral-950 text-white font-medium shadow-sm"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-950"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Form */}
      {mode === "live" && (
        <form onSubmit={handleEvaluateCustomArtifact} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Inspect Evidence for Downloaded Artifact
            </h4>
            <p className="text-xs text-neutral-500">
              Upload a binary and paste its signed release manifest to synthesize verified cryptographic integrity, publisher authorship, and on-chain commitments.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1">Target file:</label>
              <input
                type="file"
                onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-neutral-600 self-end leading-relaxed">
              The publisher key is resolved from the Monad Testnet registry using the manifest&apos;s
              <code className="font-mono"> publisherId</code>.
            </p>
          </div>

          <div className="text-xs">
            <label className="text-neutral-700 font-medium block mb-1">Signed release manifest JSON:</label>
            <textarea
              rows={3}
              placeholder="Paste manifest JSON..."
              value={customManifestText}
              onChange={(e) => setCustomManifestText(e.target.value)}
              className="w-full rounded-md bg-white border border-neutral-200 p-2 font-mono text-[11px] text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none"
            />
          </div>

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={isEvaluatingCustom}
              className="px-6 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold text-xs transition-all shadow-sm flex items-center space-x-2"
            >
              {isEvaluatingCustom ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <span>Synthesize Risk Report</span>
              )}
            </button>
          </div>

          {customError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-300 text-red-950 text-xs flex items-center space-x-2">
              <X className="w-4 h-4 text-red-700 shrink-0" />
              <span>{customError}</span>
            </div>
          )}
        </form>
      )}

      {/* Report Display */}
      {report && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Assessment Card */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono font-bold">
                  Synthesized Provenance Assessment
                </span>
                <h3 className="text-lg font-bold text-neutral-950">{report.assessmentTitle}</h3>
              </div>

              {/* Provenance meter */}
              <div className="flex items-center space-x-4 bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200">
                <div className="text-right">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono font-semibold">
                    Provenance Score
                  </div>
                  <div className="text-base font-mono font-bold text-neutral-950">
                    {report.provenanceScore}%
                  </div>
                </div>
                <div className="w-20 h-2.5 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-neutral-950 transition-all duration-300"
                    style={{ width: `${report.provenanceScore}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium">
              {report.summary}
            </p>

            {/* Explanation steps */}
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
              <div className="font-bold text-neutral-950 uppercase tracking-wider text-[11px] font-mono">
                Provenance Reasoning Steps:
              </div>
              <ul className="space-y-1.5 text-neutral-700">
                {report.explanationSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-neutral-500 font-mono font-semibold shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Evidence Sources List */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Evidence Sources &amp; Audit Trail
            </h4>

            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm divide-y divide-neutral-200">
              {report.findings.map((f) => {
                const isPositive = f.status === "POSITIVE";
                const isFlagged = f.status === "FLAGGED";

                return (
                  <div
                    key={f.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-neutral-950">{f.title}</span>
                        <span className="text-[10px] text-neutral-500 font-mono bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                          {f.sourceType}
                        </span>
                        {f.demoOnly && (
                          <span className="text-[10px] bg-neutral-950 text-white px-2 py-0.5 rounded font-mono font-medium">
                            Simulated Demo
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600 text-xs">{f.description}</p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1.5 border ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                            : isFlagged
                            ? "bg-red-50 text-red-900 border-red-300"
                            : "bg-neutral-100 text-neutral-800 border-neutral-300"
                        }`}
                      >
                        {isPositive && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        {isFlagged && <X className="w-3.5 h-3.5 text-red-700" />}
                        {!isPositive && !isFlagged && <HelpCircle className="w-3.5 h-3.5 text-neutral-600" />}
                        <span>{f.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Honest scanner disclosure */}
          <div className="p-4 rounded-lg border-l-4 border-l-neutral-950 border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 space-y-1">
            <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-neutral-700" />
              <span>Core Security Axiom</span>
            </div>
            <p className="leading-relaxed">
              A valid digital signature verifies who authored the release. It does not prove the software is free from zero-day vulnerabilities, runtime backdoors, or malicious build pipeline tampering.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
