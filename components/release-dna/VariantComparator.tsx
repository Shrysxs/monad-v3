"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  Check,
  X,
  AlertTriangle,
  Upload,
  Search,
  Copy,
  CheckCheck,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  compareArtifacts,
  type ArtifactProfile,
  type ReleaseDnaComparison,
} from "@/lib/risk/release-dna";
import {
  getDemoFixtures,
  DEMO_PUBLISHER,
  DEMO_MONAD_PUBLISHER,
  type DemoFixtureItem,
} from "@/lib/demo-data/fixtures";
import { sha256Bytes } from "@/lib/crypto/hashing";
import { parseAndValidateManifest } from "@/lib/manifests/manifest";
import {
  fetchOnChainRelease,
  fetchOnChainReleaseByFileHash,
  getRegistryAddress,
} from "@/lib/chain/contract";
import { LineageTimeline } from "./LineageTimeline";

export function VariantComparator() {
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [comparison, setComparison] = useState<ReleaseDnaComparison | null>(null);

  const [artifactA, setArtifactA] = useState<ArtifactProfile | null>(null);
  const [artifactB, setArtifactB] = useState<ArtifactProfile | null>(null);
  const [activePreset, setActivePreset] = useState<string>("same-name-different-hash");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live input states
  const [inputAFile, setInputAFile] = useState<File | null>(null);
  const [inputAManifestText, setInputAManifestText] = useState<string>("");
  const [inputAHashOrDigest, setInputAHashOrDigest] = useState<string>("");

  const [inputBFile, setInputBFile] = useState<File | null>(null);
  const [inputBManifestText, setInputBManifestText] = useState<string>("");
  const [inputBHashOrDigest, setInputBHashOrDigest] = useState<string>("");

  const [isProcessingLive, setIsProcessingLive] = useState<boolean>(false);
  const [liveErrorMessage, setLiveErrorMessage] = useState<string | null>(null);

  const registryAddress = getRegistryAddress();

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  useEffect(() => {
    async function loadFixtures() {
      const items = await getDemoFixtures();
      setFixtures(items);
      if (items.length > 0) {
        applyPreset("same-name-different-hash", items);
      }
    }
    loadFixtures();
  }, []);

  function applyPreset(presetKey: string, items = fixtures) {
    setActivePreset(presetKey);
    if (items.length < 5) return;

    const authenticUbuntu = items.find((f) => f.id === "fixture-authentic-ubuntu")!;
    const tamperedUbuntu = items.find((f) => f.id === "fixture-tampered-ubuntu")!;
    const repackedUbuntu = items.find((f) => f.id === "fixture-repacked-ubuntu")!;
    const revokedMonad = items.find((f) => f.id === "fixture-revoked-monad")!;
    const supersededMonad = items.find((f) => f.id === "fixture-superseded-monad")!;

    let artA: ArtifactProfile;
    let artB: ArtifactProfile;

    if (presetKey === "same-name-different-hash") {
      artA = {
        id: "art-authentic-ubuntu",
        fileName: authenticUbuntu.fileName,
        fileSize: authenticUbuntu.fileBytes.byteLength,
        sha256: authenticUbuntu.manifest.sha256,
        manifest: authenticUbuntu.manifest,
        releaseRecord: authenticUbuntu.releaseRecord,
        isDemo: true,
      };
      artB = {
        id: "art-repack-untrusted",
        fileName: repackedUbuntu.fileName,
        fileSize: repackedUbuntu.fileBytes.byteLength,
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        isDemo: true,
      };
    } else if (presetKey === "bit-rot-tampered") {
      artA = {
        id: "art-authentic-ubuntu",
        fileName: authenticUbuntu.fileName,
        fileSize: authenticUbuntu.fileBytes.byteLength,
        sha256: authenticUbuntu.manifest.sha256,
        manifest: authenticUbuntu.manifest,
        releaseRecord: authenticUbuntu.releaseRecord,
        isDemo: true,
      };
      artB = {
        id: "art-tampered-ubuntu",
        fileName: tamperedUbuntu.fileName,
        fileSize: tamperedUbuntu.fileBytes.byteLength,
        sha256: "b45a6c112233445566778899aabbccddeeff00112233445566778899aabbccdd",
        manifest: {
          ...tamperedUbuntu.manifest,
          chunkHashes: [
            "diff_chunk_0",
            ...(tamperedUbuntu.manifest.chunkHashes?.slice(1) ?? []),
          ],
        },
        releaseRecord: tamperedUbuntu.releaseRecord,
        isDemo: true,
      };
    } else if (presetKey === "revoked-evolution") {
      artA = {
        id: "art-superseded-v0.1.0",
        fileName: supersededMonad.fileName,
        fileSize: supersededMonad.fileBytes.byteLength,
        sha256: supersededMonad.manifest.sha256,
        manifest: supersededMonad.manifest,
        releaseRecord: supersededMonad.releaseRecord,
        isDemo: true,
      };
      artB = {
        id: "art-revoked-v0.2.1",
        fileName: revokedMonad.fileName,
        fileSize: revokedMonad.fileBytes.byteLength,
        sha256: revokedMonad.manifest.sha256,
        manifest: revokedMonad.manifest,
        releaseRecord: revokedMonad.releaseRecord,
        isDemo: true,
      };
    } else {
      // Exact Match
      artA = {
        id: "art-canonical-node",
        fileName: authenticUbuntu.fileName,
        fileSize: authenticUbuntu.fileBytes.byteLength,
        sha256: authenticUbuntu.manifest.sha256,
        manifest: authenticUbuntu.manifest,
        releaseRecord: authenticUbuntu.releaseRecord,
        isDemo: true,
      };
      artB = {
        id: "art-mirror-node",
        fileName: authenticUbuntu.fileName,
        fileSize: authenticUbuntu.fileBytes.byteLength,
        sha256: authenticUbuntu.manifest.sha256,
        manifest: authenticUbuntu.manifest,
        releaseRecord: authenticUbuntu.releaseRecord,
        isDemo: true,
      };
    }

    setArtifactA(artA);
    setArtifactB(artB);
    setComparison(compareArtifacts(artA, artB));
  }

  async function resolveArtifact(
    label: string,
    file: File | null,
    manifestText: string,
    hashOrDigest: string
  ): Promise<ArtifactProfile> {
    let sha256 = "";
    let fileName = label;
    let fileSize = 0;
    let manifestData = undefined;

    if (file) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      sha256 = await sha256Bytes(bytes);
      fileName = file.name;
      fileSize = bytes.byteLength;
    }

    if (manifestText.trim()) {
      const parsed = await parseAndValidateManifest(manifestText);
      if (parsed.valid) {
        manifestData = parsed.manifest;
        if (!sha256) sha256 = parsed.manifest.sha256;
        if (fileName === label) fileName = parsed.manifest.fileName;
        if (!fileSize) fileSize = parsed.manifest.fileSize;
      }
    }

    const cleanInput = hashOrDigest.trim().toLowerCase();
    if (!sha256 && cleanInput) {
      sha256 = cleanInput.replace(/^0x/, "");
      fileName = `${label} (${sha256.slice(0, 8)}...)`;
    }

    if (!sha256) {
      throw new Error(`Please provide a file, manifest, or hash for ${label}.`);
    }

    let releaseRecord = undefined;
    try {
      const formatted = ("0x" + sha256.replace(/^0x/, "")) as `0x${string}`;
      const byHash = await fetchOnChainReleaseByFileHash(formatted);
      if (byHash) {
        releaseRecord = byHash;
      } else {
        const byDigest = await fetchOnChainRelease(formatted);
        if (byDigest) {
          releaseRecord = byDigest;
        }
      }
    } catch {
      // Graceful fallback
    }

    return {
      id: `live-${label.toLowerCase().replace(/\s+/g, "-")}`,
      fileName,
      fileSize,
      sha256: sha256.replace(/^0x/, ""),
      manifest: manifestData,
      releaseRecord,
      isDemo: false,
    };
  }

  async function handleCompareLiveArtifacts(e: React.FormEvent) {
    e.preventDefault();
    setIsProcessingLive(true);
    setLiveErrorMessage(null);

    try {
      const artA = await resolveArtifact(
        "Artifact A",
        inputAFile,
        inputAManifestText,
        inputAHashOrDigest
      );
      const artB = await resolveArtifact(
        "Artifact B",
        inputBFile,
        inputBManifestText,
        inputBHashOrDigest
      );

      setArtifactA(artA);
      setArtifactB(artB);
      setComparison(compareArtifacts(artA, artB));
    } catch (err: any) {
      setLiveErrorMessage(err.message || "Failed to compare artifacts");
    } finally {
      setIsProcessingLive(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-neutral-200 space-x-2">
        <button
          type="button"
          onClick={() => {
            setMode("demo");
            applyPreset("same-name-different-hash");
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            mode === "demo"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          Sample forensic comparisons
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("live");
            setComparison(null);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            mode === "live"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          Live on-chain lookup
        </button>
      </div>

      {/* Preset selector for demo mode */}
      {mode === "demo" && (
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
              Sample Forensic Scenarios (Demo Data):
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("same-name-different-hash")}
              className={`px-3 py-1.5 rounded text-xs transition-all ${
                activePreset === "same-name-different-hash"
                  ? "bg-neutral-950 text-white font-medium shadow-sm"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              Same name, different hash (Untrusted repack)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("bit-rot-tampered")}
              className={`px-3 py-1.5 rounded text-xs transition-all ${
                activePreset === "bit-rot-tampered"
                  ? "bg-neutral-950 text-white font-medium shadow-sm"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              1-piece modification (Chunk diff)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("revoked-evolution")}
              className={`px-3 py-1.5 rounded text-xs transition-all ${
                activePreset === "revoked-evolution"
                  ? "bg-neutral-950 text-white font-medium shadow-sm"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              Version evolution &amp; revocation
            </button>

            <button
              type="button"
              onClick={() => applyPreset("exact-match")}
              className={`px-3 py-1.5 rounded text-xs transition-all ${
                activePreset === "exact-match"
                  ? "bg-neutral-950 text-white font-medium shadow-sm"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              Exact mirror match
            </button>
          </div>
        </div>
      )}

      {/* Mode: Live On-Chain Lookup */}
      {mode === "live" && (
        <form onSubmit={handleCompareLiveArtifacts} className="space-y-6">
          {/* Empty State Banner explaining registry is newly deployed */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2 shadow-sm">
            <div className="font-bold text-neutral-950 flex items-center space-x-2 font-mono uppercase tracking-wider">
              <Info className="w-4 h-4 text-neutral-700" />
              <span>Monad Testnet Registry Status</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              The live contract at <code className="text-neutral-950 font-mono bg-neutral-200/60 px-1.5 py-0.5 rounded">{registryAddress.slice(0, 10)}...{registryAddress.slice(-6)}</code> currently has no public release records registered. You can query custom hashes below, or{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("demo");
                  applyPreset("same-name-different-hash");
                }}
                className="text-neutral-950 font-bold underline hover:no-underline"
              >
                load sample data to preview comparison forensics
              </button>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Artifact A */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
                Artifact A (Candidate)
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-700 font-medium block mb-1">Local file:</label>
                  <input
                    type="file"
                    onChange={(e) => setInputAFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-neutral-700 font-medium block mb-1">Or SHA-256 / Release digest:</label>
                  <input
                    type="text"
                    placeholder="0x... or 64-char hex"
                    value={inputAHashOrDigest}
                    onChange={(e) => setInputAHashOrDigest(e.target.value)}
                    className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="text-neutral-700 font-medium block mb-1">Signed manifest JSON (Optional):</label>
                  <textarea
                    rows={2}
                    placeholder="Paste manifest JSON..."
                    value={inputAManifestText}
                    onChange={(e) => setInputAManifestText(e.target.value)}
                    className="w-full rounded-md bg-white border border-neutral-200 p-2 font-mono text-[11px] text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Artifact B */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
                Artifact B (Reference)
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-700 font-medium block mb-1">Local file:</label>
                  <input
                    type="file"
                    onChange={(e) => setInputBFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-neutral-700 font-medium block mb-1">Or SHA-256 / Release digest:</label>
                  <input
                    type="text"
                    placeholder="0x... or 64-char hex"
                    value={inputBHashOrDigest}
                    onChange={(e) => setInputBHashOrDigest(e.target.value)}
                    className="w-full rounded-md bg-white border border-neutral-200 px-3 py-1.5 font-mono text-xs text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="text-neutral-700 font-medium block mb-1">Signed manifest JSON (Optional):</label>
                  <textarea
                    rows={2}
                    placeholder="Paste manifest JSON..."
                    value={inputBManifestText}
                    onChange={(e) => setInputBManifestText(e.target.value)}
                    className="w-full rounded-md bg-white border border-neutral-200 p-2 font-mono text-[11px] text-neutral-950 focus:outline-none focus:border-neutral-950 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isProcessingLive}
              className="px-6 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold text-xs transition-all shadow-sm flex items-center space-x-2"
            >
              {isProcessingLive ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Comparing artifacts...</span>
                </>
              ) : (
                <span>Compare artifacts</span>
              )}
            </button>
          </div>

          {liveErrorMessage && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-300 text-red-950 text-xs flex items-center space-x-2">
              <X className="w-4 h-4 text-red-700 shrink-0" />
              <span>{liveErrorMessage}</span>
            </div>
          )}
        </form>
      )}

      {/* Side-by-Side Artifact Profiles */}
      {artifactA && artifactB && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card A */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono font-bold">
                Artifact A (Candidate)
              </span>
              <div className="flex items-center space-x-1.5">
                {artifactA.isDemo && (
                  <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200 font-mono">
                    Demo data
                  </span>
                )}
                <span className="text-[10px] bg-neutral-950 text-white px-2 py-0.5 rounded font-mono font-medium">
                  {artifactA.releaseRecord?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-neutral-950 text-sm truncate">{artifactA.fileName}</div>
              <div className="text-neutral-600">
                Size: <span className="text-neutral-950 font-medium">{formatBytes(artifactA.fileSize)}</span>
              </div>
              <div className="text-neutral-600 truncate">
                Publisher: <span className="text-neutral-950 font-semibold">{artifactA.manifest?.publisherId ?? "Unregistered"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] gap-2">
                <span className="truncate text-neutral-800">SHA: {artifactA.sha256}</span>
                <button
                  type="button"
                  onClick={() => copyText("artA", artifactA.sha256)}
                  className="text-neutral-400 hover:text-neutral-950 shrink-0 p-0.5"
                  title="Copy SHA-256 hash"
                >
                  {copiedKey === "artA" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card B */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono font-bold">
                Artifact B (Reference)
              </span>
              <div className="flex items-center space-x-1.5">
                {artifactB.isDemo && (
                  <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200 font-mono">
                    Demo data
                  </span>
                )}
                <span className="text-[10px] bg-neutral-950 text-white px-2 py-0.5 rounded font-mono font-medium">
                  {artifactB.releaseRecord?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-neutral-950 text-sm truncate">{artifactB.fileName}</div>
              <div className="text-neutral-600">
                Size: <span className="text-neutral-950 font-medium">{formatBytes(artifactB.fileSize)}</span>
              </div>
              <div className="text-neutral-600 truncate">
                Publisher: <span className="text-neutral-950 font-semibold">{artifactB.manifest?.publisherId ?? "Unregistered"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] gap-2">
                <span className="truncate text-neutral-800">SHA: {artifactB.sha256}</span>
                <button
                  type="button"
                  onClick={() => copyText("artB", artifactB.sha256)}
                  className="text-neutral-400 hover:text-neutral-950 shrink-0 p-0.5"
                  title="Copy SHA-256 hash"
                >
                  {copiedKey === "artB" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-xl border border-neutral-200 bg-white space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono font-bold">
                  Forensic Relationship
                </span>
                <h3 className="text-lg font-bold text-neutral-950">{comparison.verdictTitle}</h3>
              </div>
              <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-neutral-950 text-white shadow-sm">
                {comparison.relationship}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium">
              {comparison.explanation}
            </p>

            {/* Comparison Metrics Tables */}
            <div className="pt-4 border-t border-neutral-200 space-y-4">
              <div>
                <h5 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider mb-2">
                  Section 1: Monad Testnet On-Chain Commitments
                </h5>
                <div className="rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Registry Property</th>
                        <th className="py-2.5 px-3 font-semibold">Artifact A</th>
                        <th className="py-2.5 px-3 font-semibold">Artifact B</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Evaluation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-900">
                      <tr>
                        <td className="py-2.5 px-3 text-neutral-500">Registry status</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{comparison.diff.statusA}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{comparison.diff.statusB}</td>
                        <td className="py-2.5 px-3 text-right">
                          {comparison.diff.statusA === "REVOKED" || comparison.diff.statusB === "REVOKED" ? (
                            <span className="text-red-800 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              Revocation Present
                            </span>
                          ) : comparison.diff.statusA === "ACTIVE" && comparison.diff.statusB === "ACTIVE" ? (
                            <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Both Active
                            </span>
                          ) : (
                            <span className="text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">Status Verified</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-neutral-500">Publisher identity</td>
                        <td className="py-2.5 px-3 truncate max-w-[140px]">
                          {artifactA?.manifest?.publisherId ?? "Unregistered"}
                        </td>
                        <td className="py-2.5 px-3 truncate max-w-[140px]">
                          {artifactB?.manifest?.publisherId ?? "Unregistered"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {comparison.diff.publisherMatch ? (
                            <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Identical Publisher
                            </span>
                          ) : (
                            <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Different Publishers
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider mb-2">
                  Section 2: Local Cryptographic &amp; Byte Comparison
                </h5>
                <div className="rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Metric</th>
                        <th className="py-2.5 px-3 font-semibold">Artifact A</th>
                        <th className="py-2.5 px-3 font-semibold">Artifact B</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-900">
                      <tr>
                        <td className="py-2.5 px-3 text-neutral-500">Filename</td>
                        <td className="py-2.5 px-3 font-mono truncate max-w-[140px]">{artifactA?.fileName}</td>
                        <td className="py-2.5 px-3 font-mono truncate max-w-[140px]">{artifactB?.fileName}</td>
                        <td className="py-2.5 px-3 text-right">
                          {comparison.diff.fileNameMatch ? (
                            <span className="text-neutral-900 font-medium">Same name</span>
                          ) : (
                            <span className="text-neutral-500">Different name</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-neutral-500">SHA-256 hash</td>
                        <td className="py-2.5 px-3 font-mono truncate max-w-[140px]">{artifactA?.sha256.slice(0, 16)}...</td>
                        <td className="py-2.5 px-3 font-mono truncate max-w-[140px]">{artifactB?.sha256.slice(0, 16)}...</td>
                        <td className="py-2.5 px-3 text-right">
                          {comparison.diff.hashMatch ? (
                            <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Exact Byte Match
                            </span>
                          ) : (
                            <span className="text-red-800 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              Byte Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-neutral-500">File size</td>
                        <td className="py-2.5 px-3">{formatBytes(artifactA?.fileSize || 0)}</td>
                        <td className="py-2.5 px-3">{formatBytes(artifactB?.fileSize || 0)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {comparison.diff.sizeMatch ? (
                            <span className="text-neutral-900 font-medium">Equal size</span>
                          ) : (
                            <span className="text-neutral-500">Δ {comparison.diff.sizeDeltaBytes} B</span>
                          )}
                        </td>
                      </tr>
                      {comparison.diff.chunkDiff && (
                        <tr>
                          <td className="py-2.5 px-3 text-neutral-500">Piece / Chunk diff</td>
                          <td className="py-2.5 px-3" colSpan={2}>
                            {comparison.diff.chunkDiff.identicalChunks} / {comparison.diff.chunkDiff.chunksA} identical pieces
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {comparison.diff.chunkDiff.differingChunks} piece(s) changed
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Lineage Graph */}
          <LineageTimeline
            nodes={comparison.lineageNodes}
            edges={comparison.lineageEdges}
          />
        </div>
      )}
    </div>
  );
}
