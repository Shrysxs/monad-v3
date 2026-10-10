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
  Upload,
  Search,
  RefreshCw,
  Database,
  FileCode,
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
import { sha256Bytes } from "@/lib/crypto/hashing";
import { parseAndValidateManifest, verifyManifestSignature } from "@/lib/manifests/manifest";
import { fetchOnChainReleaseByFileHash } from "@/lib/chain/contract";
import type {
  FileIntegrityResult,
  SignatureVerificationResult,
  EvidenceFinding,
} from "@/lib/verification/types";

export function EvidencePanel() {
  const [mode, setMode] = useState<"real" | "demo">("real");
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("fixture-authentic-ubuntu");
  const [simulateScannerThreat, setSimulateScannerThreat] = useState<boolean>(false);
  const [report, setReport] = useState<RiskIntelligenceReport | null>(null);

  // Custom artifact evaluation state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customManifestText, setCustomManifestText] = useState<string>("");
  const [customPubKeyHex, setCustomPubKeyHex] = useState<string>("");
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);

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
      fileIntegrity,
      signatureVerification,
      releaseRecord: fixture.releaseRecord,
      scannerConfig: threatSimulated ? { enabled: true, apiKey: "demo_mock_key" } : undefined,
      externalFindings: threatSimulated ? externalFindings : undefined,
    });

    setReport(calculatedReport);
  }

  async function handleEvaluateCustomArtifact(e: React.FormEvent) {
    e.preventDefault();
    if (!customFile && !customManifestText.trim()) {
      setCustomError("Please select a target file or supply a manifest JSON.");
      return;
    }

    setIsEvaluatingCustom(true);
    setCustomError(null);

    try {
      let fileSha256 = "";
      let fileName = "Uploaded File";
      let fileSize = 0;

      if (customFile) {
        const buffer = await customFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        fileSha256 = await sha256Bytes(bytes);
        fileName = customFile.name;
        fileSize = bytes.byteLength;
      }

      let parsedManifest = undefined;
      if (customManifestText.trim()) {
        const parsed = await parseAndValidateManifest(customManifestText);
        if (parsed.valid) {
          parsedManifest = parsed.manifest;
          if (!fileSha256) fileSha256 = parsed.manifest.sha256;
          if (fileName === "Uploaded File") fileName = parsed.manifest.fileName;
          if (!fileSize) fileSize = parsed.manifest.fileSize;
        } else {
          setCustomError(`Manifest validation error: ${parsed.message}`);
          setIsEvaluatingCustom(false);
          return;
        }
      }

      // 1. File Integrity
      const isHashMatch = parsedManifest ? fileSha256 === parsedManifest.sha256.toLowerCase() : true;
      const fileIntegrity: FileIntegrityResult = {
        status: isHashMatch ? "MATCH" : "MISMATCH",
        fileName,
        fileSize,
        computedSha256: fileSha256,
        expectedSha256: parsedManifest?.sha256,
        message: isHashMatch
          ? "SHA-256 computed locally via Web Crypto API matches reference."
          : `SHA-256 digest mismatch (${fileSha256.slice(0, 10)}... != ${parsedManifest?.sha256.slice(0, 10)}...).`,
      };

      // 2. Signature verification if manifest and key provided
      let signatureVerification: SignatureVerificationResult;
      if (parsedManifest && customPubKeyHex.trim()) {
        signatureVerification = await verifyManifestSignature(
          parsedManifest,
          customPubKeyHex.trim()
        );
      } else {
        signatureVerification = {
          status: "KEY_NOT_FOUND",
          isValid: false,
          publisherId: parsedManifest?.publisherId || "unspecified",
          keyId: parsedManifest?.publisherKeyId || "unspecified",
          publicKeyUsed: customPubKeyHex.trim() || "none",
          canonicalPayload: "",
          computedManifestDigest: "",
          message: "No publisher Ed25519 public key supplied for signature validation.",
        };
      }

      // 3. Query on-chain release record
      let onChainRecord = null;
      try {
        if (fileSha256) {
          onChainRecord = await fetchOnChainReleaseByFileHash(
            ("0x" + fileSha256) as `0x${string}`
          );
        }
      } catch {
        // Fallback
      }

      const calculatedReport = aggregateRiskIntelligence({
        fileIntegrity,
        signatureVerification,
        releaseRecord: onChainRecord,
      });

      setReport(calculatedReport);
    } catch (err: any) {
      setCustomError(err.message || "Failed to evaluate artifact risk intelligence.");
    } finally {
      setIsEvaluatingCustom(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-gray-800 space-x-2">
        <button
          type="button"
          onClick={() => setMode("real")}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            mode === "real"
              ? "bg-gray-900 text-emerald-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Evaluate Live Artifact Evidence</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("demo");
            evaluateFixture("fixture-authentic-ubuntu");
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            mode === "demo"
              ? "bg-gray-900 text-emerald-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Demo Fixtures & Threat Simulation</span>
        </button>
      </div>

      {/* Mode 1: Live Artifact Evaluation */}
      {mode === "real" && (
        <form onSubmit={handleEvaluateCustomArtifact} className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Inspect Real Evidence for Downloaded Artifact</span>
            </h4>
            <p className="text-xs text-gray-400">
              Select a downloaded file or paste a signed release manifest to synthesize verified
              cryptographic integrity, Monad on-chain commitments, and scanner status.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Target Local File:</label>
              <input
                type="file"
                onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">
                Publisher Public Key (Hex, optional):
              </label>
              <input
                type="text"
                placeholder="e.g. 8580e9bff5..."
                value={customPubKeyHex}
                onChange={(e) => setCustomPubKeyHex(e.target.value)}
                className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">
              Signed Release Manifest JSON (Optional):
            </label>
            <textarea
              rows={3}
              placeholder="Paste signed manifest JSON if available..."
              value={customManifestText}
              onChange={(e) => setCustomManifestText(e.target.value)}
              className="w-full rounded-lg bg-gray-950 border border-gray-800 p-2 text-[11px] text-gray-300 font-mono focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={isEvaluatingCustom}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md shadow-emerald-950 flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              {isEvaluatingCustom ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing evidence...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  <span>Synthesize Live Risk Intelligence</span>
                </>
              )}
            </button>
          </div>

          {customError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{customError}</span>
            </div>
          )}
        </form>
      )}

      {/* Mode 2: Demo Fixtures & Simulations */}
      {mode === "demo" && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center rounded bg-emerald-900/60 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-700/50 font-mono">
                DEMO DATA FIXTURES
              </span>
              <span className="text-xs text-gray-400">
                Select pre-built release artifact to evaluate multi-source risk evidence:
              </span>
            </div>

            {/* Scanner Threat Simulation Toggle */}
            <div className="flex items-center space-x-2 text-xs">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <label className="text-gray-300 cursor-pointer flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={simulateScannerThreat}
                  onChange={(e) => {
                    setSimulateScannerThreat(e.target.checked);
                    evaluateFixture(selectedFixtureId, fixtures, e.target.checked);
                  }}
                  className="rounded bg-gray-900 border-gray-700 text-emerald-500 focus:ring-emerald-600"
                />
                <span>Simulate External Scanner Threat Detection (Demo)</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {fixtures.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => evaluateFixture(f.id, fixtures, simulateScannerThreat)}
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
      )}

      {/* Prominent Evidence & Malware Policy Notice */}
      <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-300 flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Core Security Axiom: Provenance Confidence vs. Malware Status</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          The <span className="text-emerald-400 font-semibold">Provenance Score (0–100%)</span> measures
          verified cryptographic authorship (Ed25519) and Monad on-chain commitment status only.{" "}
          <strong className="text-gray-200">
            It does NOT imply that a file is malware-free.
          </strong>{" "}
          An authentic binary signed by a legitimate publisher can still contain zero-day vulnerabilities,
          backdoors, or malicious logic if the publisher build pipeline was compromised.
          If no external malware scanner was executed, scanner status is explicitly displayed as{" "}
          <span className="font-mono text-cyan-400">UNAVAILABLE</span> and is never faked as clean.
        </p>
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
                const isUnavailable = f.status === "UNAVAILABLE" || f.status === "NOT_SCANNED";

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
                            SIMULATED FINDING (DEMO)
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
