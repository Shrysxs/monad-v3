"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sliders,
  Info,
} from "lucide-react";
import {
  aggregateRiskIntelligence,
  type RiskIntelligenceReport,
} from "@/lib/risk/evidence";
import {
  getDemoFixtures,
  DEMO_PUBLISHER,
  DEMO_MONAD_PUBLISHER,
  type DemoFixtureItem,
} from "@/lib/demo-data/fixtures";
import type {
  FileIntegrityResult,
  SignatureVerificationResult,
  EvidenceFinding,
} from "@/lib/verification/types";

export function EvidencePanel() {
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("fixture-authentic-ubuntu");
  const [simulateScannerThreat, setSimulateScannerThreat] = useState<boolean>(false);
  const [report, setReport] = useState<RiskIntelligenceReport | null>(null);

  useEffect(() => {
    async function load() {
      const items = await getDemoFixtures();
      setFixtures(items);
      evaluateFixture("fixture-authentic-ubuntu", items, false);
    }
    load();
  }, []);

  function evaluateFixture(
    fixtureId: string,
    items = fixtures,
    threatSimulated = simulateScannerThreat
  ) {
    setSelectedFixtureId(fixtureId);
    const fixture = items.find((f) => f.id === fixtureId);
    if (!fixture) return;

    const isTampered = fixture.id.includes("tampered") || fixture.id.includes("repack");

    const chunksCount = fixture.manifest.chunkHashes?.length ?? 0;

    const fileIntegrity: FileIntegrityResult = {
      status: isTampered ? "MISMATCH" : "MATCH",
      fileName: fixture.fileName,
      fileSize: fixture.fileBytes.byteLength,
      computedSha256: fixture.manifest.sha256,
      expectedSha256: fixture.manifest.sha256,
      chunksTotal: chunksCount,
      chunksMatched: isTampered ? Math.max(0, chunksCount - 1) : chunksCount,
      message: isTampered
        ? "Computed hash differs from expected manifest checksum"
        : "Computed hash matches signed manifest exactly",
    };

    const signatureVerification: SignatureVerificationResult = {
      status: "VALID",
      isValid: true,
      publisherId: fixture.manifest.publisherId,
      keyId: fixture.manifest.publisherKeyId,
      publicKeyUsed:
        fixture.manifest.publisherId === DEMO_MONAD_PUBLISHER.publisherId
          ? DEMO_MONAD_PUBLISHER.publicKeyHex
          : DEMO_PUBLISHER.publicKeyHex,
      canonicalPayload: "{}",
      computedManifestDigest: "0x" + fixture.manifest.sha256,
      message: "Valid Ed25519 signature verified",
    };

    // External findings for threat simulation
    const externalFindings: EvidenceFinding[] = [];
    if (threatSimulated) {
      externalFindings.push({
        id: "simulated-scanner-finding",
        sourceId: "virustotal-community-heuristics",
        sourceType: "STATIC_SCANNER",
        title: "Heuristic Signature Detection: Trojan.Dropper.Gen",
        description:
          "Static analysis flagged suspicious obfuscated shell script embedding.",
        status: "FLAGGED",
        observedAt: Date.now(),
        isStale: false,
        demoOnly: true,
      });
    }

    const calculatedReport = aggregateRiskIntelligence({
      fileIntegrity,
      signatureVerification,
      releaseRecord: fixture.releaseRecord,
      scannerConfig: threatSimulated ? { enabled: true, apiKey: "demo_mock_key" } : undefined,
      externalFindings: threatSimulated ? externalFindings : undefined,
    });

    setReport(calculatedReport);
  }

  function handleFixtureChange(id: string) {
    evaluateFixture(id, fixtures, simulateScannerThreat);
  }

  function handleThreatToggle(simulated: boolean) {
    setSimulateScannerThreat(simulated);
    evaluateFixture(selectedFixtureId, fixtures, simulated);
  }

  return (
    <div className="space-y-8">
      {/* Target Selector and Simulation Controls */}
      <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded bg-emerald-900/60 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-700/50">
              EVIDENCE TARGET
            </span>
            <span className="text-xs text-gray-400">
              Select release artifact to evaluate multi-source risk evidence:
            </span>
          </div>

          {/* Scanner Threat Simulation Toggle */}
          <div className="flex items-center space-x-2 text-xs">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <label className="text-gray-300 cursor-pointer flex items-center space-x-2">
              <input
                type="checkbox"
                checked={simulateScannerThreat}
                onChange={(e) => handleThreatToggle(e.target.checked)}
                className="rounded bg-gray-900 border-gray-700 text-emerald-500 focus:ring-emerald-600"
              />
              <span>Simulate External Scanner Threat Detection</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {fixtures.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFixtureChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFixtureId === f.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Main Risk Intelligence Assessment Card */}
          <div
            className={`rounded-2xl border p-6 space-y-5 ${
              report.assessment === "AUTHENTICITY_CONFIRMED_SECURITY_UNKNOWN"
                ? "bg-emerald-950/20 border-emerald-800/60"
                : report.assessment === "REVOKED_RELEASE"
                ? "bg-rose-950/30 border-rose-800/80"
                : report.assessment === "SUSPICIOUS_SECURITY_FINDING" ||
                  report.assessment === "CONFLICTING_EVIDENCE"
                ? "bg-amber-950/30 border-amber-800/80"
                : "bg-gray-900/60 border-gray-800"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Synthesized Risk Assessment
                </span>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>{report.assessmentTitle}</span>
                </h3>
              </div>

              {/* Provenance Confidence Score Meter */}
              <div className="flex items-center space-x-3 bg-gray-950/80 px-4 py-2 rounded-xl border border-gray-800">
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase font-mono">
                    Provenance Score
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {report.provenanceScore}%
                  </div>
                </div>
                <div className="w-12 h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      report.provenanceScore >= 80
                        ? "bg-emerald-400"
                        : report.provenanceScore > 0
                        ? "bg-amber-400"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${report.provenanceScore}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>

            {/* Explanation Steps */}
            <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1.5">
              <div className="text-xs font-semibold text-gray-300">
                Assessment Reasoning & Provenance Steps:
              </div>
              <ul className="text-xs text-gray-400 space-y-1">
                {report.explanationSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-emerald-500 shrink-0 font-mono">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Evidence Sources List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-200">
              Evidence Sources & Real-Time Status
            </h4>

            <div className="grid gap-3">
              {report.findings.map((f) => {
                const isPositive = f.status === "POSITIVE";
                const isFlagged = f.status === "FLAGGED";
                const isUnavailable = f.status === "UNAVAILABLE";

                return (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white">
                          {f.title}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          [{f.sourceType}]
                        </span>
                        {f.demoOnly && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded font-mono">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{f.description}</p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 ${
                          isPositive
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                            : isFlagged
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                            : isUnavailable
                            ? "bg-gray-800/80 text-gray-400 border border-gray-700"
                            : "bg-blue-950/80 text-blue-300 border border-blue-800"
                        }`}
                      >
                        {isPositive && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isFlagged && <XCircle className="w-3.5 h-3.5" />}
                        {isUnavailable && <HelpCircle className="w-3.5 h-3.5" />}
                        <span>{f.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
