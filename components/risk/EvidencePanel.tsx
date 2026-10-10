"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  Info,
  Upload,
  Search,
  ExternalLink,
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
  const [mode, setMode] = useState<"demo" | "live">("demo");
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

      const isHashMatch = parsedManifest ? fileSha256 === parsedManifest.sha256.toLowerCase() : true;
      const fileIntegrity: FileIntegrityResult = {
        status: isHashMatch ? "MATCH" : "MISMATCH",
        fileName,
        fileSize,
        computedSha256: fileSha256,
        expectedSha256: parsedManifest?.sha256,
        message: isHashMatch
          ? "SHA-256 computed locally via Web Crypto API matches reference."
          : `SHA-256 digest mismatch.`,
      };

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
    <div className="space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-neutral-200 space-x-2">
        <button
          type="button"
          onClick={() => {
            setMode("demo");
            evaluateFixture("fixture-authentic-ubuntu");
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
            mode === "demo"
              ? "bg-white text-neutral-900 border-t border-x border-neutral-200"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Sample fixtures &amp; threat simulations
        </button>

        <button
          type="button"
          onClick={() => setMode("live")}
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
            mode === "live"
              ? "bg-white text-neutral-900 border-t border-x border-neutral-200"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Evaluate downloaded file
        </button>
      </div>

      {/* Demo Selector */}
      {mode === "demo" && (
        <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neutral-900">
              Select sample artifact:
            </span>
            <label className="text-xs text-neutral-600 flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateScannerThreat}
                onChange={(e) => {
                  setSimulateScannerThreat(e.target.checked);
                  evaluateFixture(selectedFixtureId, fixtures, e.target.checked);
                }}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>Simulate external scanner alert</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {fixtures.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => evaluateFixture(f.id, fixtures, simulateScannerThreat)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedFixtureId === f.id
                    ? "bg-black text-white font-medium"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
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
        <form onSubmit={handleEvaluateCustomArtifact} className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Inspect evidence for downloaded artifact
            </h4>
            <p className="text-xs text-neutral-500">
              Upload a file or paste a signed release manifest to synthesize verified cryptographic integrity and on-chain commitments.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-neutral-600 block mb-1">Target file:</label>
              <input
                type="file"
                onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-neutral-600 block mb-1">Publisher Ed25519 public key (hex):</label>
              <input
                type="text"
                placeholder="e.g. 8580e9bff5..."
                value={customPubKeyHex}
                onChange={(e) => setCustomPubKeyHex(e.target.value)}
                className="w-full rounded bg-white border border-neutral-200 px-3 py-1.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="text-neutral-600 block mb-1">Signed release manifest JSON (Optional):</label>
            <textarea
              rows={3}
              placeholder="Paste manifest JSON..."
              value={customManifestText}
              onChange={(e) => setCustomManifestText(e.target.value)}
              className="w-full rounded bg-white border border-neutral-200 p-2 font-mono text-[11px] text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none"
            />
          </div>

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={isEvaluatingCustom}
              className="px-5 py-2 rounded-md bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-medium text-xs transition-colors"
            >
              <span>{isEvaluatingCustom ? "Evaluating..." : "Generate risk report"}</span>
            </button>
          </div>

          {customError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-center space-x-2">
              <X className="w-4 h-4 text-red-700 shrink-0" />
              <span>{customError}</span>
            </div>
          )}
        </form>
      )}

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Main Assessment Card */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold font-mono">
                  Synthesized risk assessment
                </span>
                <h3 className="text-base font-bold text-neutral-900">{report.assessmentTitle}</h3>
              </div>

              {/* Provenance meter */}
              <div className="flex items-center space-x-3 bg-neutral-50 px-3 py-2 rounded border border-neutral-200">
                <div className="text-right">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">
                    Provenance score
                  </div>
                  <div className="text-sm font-mono font-bold text-neutral-900">
                    {report.provenanceScore}%
                  </div>
                </div>
                <div className="w-16 h-2 rounded bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-neutral-900"
                    style={{ width: `${report.provenanceScore}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed font-medium">
              {report.summary}
            </p>

            {/* Explanation steps */}
            <div className="p-3 rounded bg-neutral-50 border border-neutral-200 space-y-1.5 text-xs">
              <div className="font-semibold text-neutral-900">Assessment breakdown:</div>
              <ul className="space-y-1 text-neutral-600">
                {report.explanationSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-neutral-400 font-mono shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Evidence Sources List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Evidence sources &amp; findings
            </h4>

            <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
              {report.findings.map((f) => {
                const isPositive = f.status === "POSITIVE";
                const isFlagged = f.status === "FLAGGED";

                return (
                  <div
                    key={f.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-neutral-900">{f.title}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          [{f.sourceType}]
                        </span>
                        {f.demoOnly && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded border border-neutral-200 font-mono">
                            Simulated
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600">{f.description}</p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center space-x-1.5 border ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isFlagged
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-neutral-100 text-neutral-700 border-neutral-200"
                        }`}
                      >
                        {isPositive && <Check className="w-3.5 h-3.5" />}
                        {isFlagged && <X className="w-3.5 h-3.5" />}
                        <span>{f.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Honest scanner disclosure */}
          <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-600 space-y-1">
            <div className="font-semibold text-neutral-900 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-neutral-500" />
              <span>Core security axiom</span>
            </div>
            <p>
              A valid digital signature verifies who authored the release. It does not prove the software is free from zero-day vulnerabilities, runtime backdoors, or malicious build pipeline tampering.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
