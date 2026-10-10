"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  FileCode,
  Layers,
  Info,
  Upload,
  Search,
  RefreshCw,
  Database,
  ExternalLink,
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
} from "@/lib/chain/contract";
import { LineageTimeline } from "./LineageTimeline";

export function VariantComparator() {
  const [mode, setMode] = useState<"real" | "demo">("real");
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [comparison, setComparison] = useState<ReleaseDnaComparison | null>(null);

  const [artifactA, setArtifactA] = useState<ArtifactProfile | null>(null);
  const [artifactB, setArtifactB] = useState<ArtifactProfile | null>(null);
  const [activePreset, setActivePreset] = useState<string>("same-name-different-hash");

  // Real input states
  const [inputAFile, setInputAFile] = useState<File | null>(null);
  const [inputAManifestText, setInputAManifestText] = useState<string>("");
  const [inputAHashOrDigest, setInputAHashOrDigest] = useState<string>("");

  const [inputBFile, setInputBFile] = useState<File | null>(null);
  const [inputBManifestText, setInputBManifestText] = useState<string>("");
  const [inputBHashOrDigest, setInputBHashOrDigest] = useState<string>("");

  const [isProcessingReal, setIsProcessingReal] = useState<boolean>(false);
  const [realErrorMessage, setRealErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadFixtures() {
      const items = await getDemoFixtures();
      setFixtures(items);
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

    // 1. Process uploaded file if provided
    if (file) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      sha256 = await sha256Bytes(bytes);
      fileName = file.name;
      fileSize = bytes.byteLength;
    }

    // 2. Process manifest if provided
    if (manifestText.trim()) {
      const parsed = await parseAndValidateManifest(manifestText);
      if (parsed.valid) {
        manifestData = parsed.manifest;
        if (!sha256) sha256 = parsed.manifest.sha256;
        if (fileName === label) fileName = parsed.manifest.fileName;
        if (!fileSize) fileSize = parsed.manifest.fileSize;
      }
    }

    // 3. Fallback to manual hash if no file or manifest
    const cleanInput = hashOrDigest.trim().toLowerCase();
    if (!sha256 && cleanInput) {
      sha256 = cleanInput.replace(/^0x/, "");
      fileName = `${label} (${sha256.slice(0, 8)}...)`;
    }

    if (!sha256) {
      throw new Error(`Please provide a file, manifest, or hash for ${label}.`);
    }

    // 4. Query real Monad Testnet registry
    let releaseRecord = undefined;
    try {
      const formatted = ("0x" + sha256.replace(/^0x/, "")) as `0x${string}`;
      // Try by file hash first
      const byHash = await fetchOnChainReleaseByFileHash(formatted);
      if (byHash) {
        releaseRecord = byHash;
      } else {
        // Try by release digest
        const byDigest = await fetchOnChainRelease(formatted);
        if (byDigest) {
          releaseRecord = byDigest;
        }
      }
    } catch {
      // Graceful fallback
    }

    return {
      id: `real-${label.toLowerCase().replace(/\s+/g, "-")}`,
      fileName,
      fileSize,
      sha256: sha256.replace(/^0x/, ""),
      manifest: manifestData,
      releaseRecord,
      isDemo: false,
    };
  }

  async function handleCompareRealArtifacts(e: React.FormEvent) {
    e.preventDefault();
    setIsProcessingReal(true);
    setRealErrorMessage(null);

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
      setRealErrorMessage(err.message || "Failed to compare artifacts");
    } finally {
      setIsProcessingReal(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Mode Selector Tabs */}
      <div className="flex border-b border-gray-800 space-x-2">
        <button
          type="button"
          onClick={() => {
            setMode("real");
            setComparison(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            mode === "real"
              ? "bg-gray-900 text-purple-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Compare Real Files / On-Chain Releases</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("demo");
            applyPreset("same-name-different-hash");
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            mode === "demo"
              ? "bg-gray-900 text-purple-400 border-t border-x border-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Forensic Case Studies (Demo Data)</span>
        </button>
      </div>

      {/* Mode 1: Real Files & On-Chain Releases */}
      {mode === "real" && (
        <form onSubmit={handleCompareRealArtifacts} className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Search className="w-4 h-4 text-purple-400" />
              <span>Release DNA: Genuine Multi-Source Forensic Comparison</span>
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Upload local files or enter Monad Testnet digests/hashes to compare actual byte payloads,
              verify publisher identities, and inspect authenticated on-chain supersession lineage.
              File hashing is performed entirely locally in your browser.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Artifact A Input Card */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold font-mono">
                  Artifact A (Candidate)
                </span>
                <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                  LOCAL / ON-CHAIN
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Local File:</label>
                  <input
                    type="file"
                    onChange={(e) => setInputAFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">
                    Or Monad SHA-256 / Release Digest:
                  </label>
                  <input
                    type="text"
                    placeholder="0x... or 64-char hex hash"
                    value={inputAHashOrDigest}
                    onChange={(e) => setInputAHashOrDigest(e.target.value)}
                    className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">
                    Signed Manifest JSON (Optional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Paste manifest JSON if available..."
                    value={inputAManifestText}
                    onChange={(e) => setInputAManifestText(e.target.value)}
                    className="w-full rounded-lg bg-gray-950 border border-gray-800 p-2 text-[11px] text-gray-300 font-mono focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Artifact B Input Card */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold font-mono">
                  Artifact B (Reference)
                </span>
                <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                  LOCAL / ON-CHAIN
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Local File:</label>
                  <input
                    type="file"
                    onChange={(e) => setInputBFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">
                    Or Monad SHA-256 / Release Digest:
                  </label>
                  <input
                    type="text"
                    placeholder="0x... or 64-char hex hash"
                    value={inputBHashOrDigest}
                    onChange={(e) => setInputBHashOrDigest(e.target.value)}
                    className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">
                    Signed Manifest JSON (Optional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Paste manifest JSON if available..."
                    value={inputBManifestText}
                    onChange={(e) => setInputBManifestText(e.target.value)}
                    className="w-full rounded-lg bg-gray-950 border border-gray-800 p-2 text-[11px] text-gray-300 font-mono focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isProcessingReal}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-all shadow-md shadow-purple-950 flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              {isProcessingReal ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing hashes and querying Monad...</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare Artifacts & Verify Lineage</span>
                </>
              )}
            </button>
          </div>

          {realErrorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{realErrorMessage}</span>
            </div>
          )}
        </form>
      )}

      {/* Mode 2: Preset Demo Case Studies */}
      {mode === "demo" && (
        <div className="rounded-xl border border-purple-900/60 bg-purple-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center rounded bg-purple-900/60 px-2 py-0.5 text-[11px] font-medium text-purple-300 border border-purple-700/50">
                FORENSIC CASE STUDIES (DEMO DATA)
              </span>
              <span className="text-xs text-gray-400">
                Simulate forensic investigations of distributed artifacts:
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("same-name-different-hash")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === "same-name-different-hash"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-950"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
              }`}
            >
              Same Name, Different Hash (Untrusted Repack)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("bit-rot-tampered")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === "bit-rot-tampered"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-950"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
              }`}
            >
              Bit-Rot / 1-Piece Modification (Chunk Diff)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("revoked-evolution")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === "revoked-evolution"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-950"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
              }`}
            >
              Version Evolution & Revoked Variant
            </button>

            <button
              type="button"
              onClick={() => applyPreset("exact-match")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === "exact-match"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-950"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
              }`}
            >
              Exact Mirror Match
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side Artifact Profiles */}
      {artifactA && artifactB && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Artifact A Profile */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold font-mono">
                Artifact A (Candidate)
              </span>
              <div className="flex items-center space-x-1.5">
                {artifactA.isDemo ? (
                  <span className="text-[10px] bg-amber-950/60 border border-amber-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                    DEMO DATA
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-mono">
                    REAL INPUT
                  </span>
                )}
                <span className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-300 px-2 py-0.5 rounded font-mono">
                  {artifactA.releaseRecord?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-base font-semibold text-white truncate">
                {artifactA.fileName}
              </div>
              <div className="text-xs text-gray-400">
                Size: <span className="text-gray-200">{artifactA.fileSize} bytes</span>
              </div>
              <div className="text-xs text-gray-400 truncate">
                Publisher:{" "}
                <span className="text-cyan-400">
                  {artifactA.manifest?.publisherId ??
                    artifactA.releaseRecord?.publisherId ??
                    "Unregistered"}
                </span>
              </div>
              <div className="text-xs text-gray-400 truncate font-mono">
                SHA-256: <span className="text-gray-300">{artifactA.sha256}</span>
              </div>
              {artifactA.releaseRecord && (
                <div className="text-[11px] text-gray-500 font-mono truncate">
                  Monad Digest: {artifactA.releaseRecord.releaseDigest}
                </div>
              )}
            </div>
          </div>

          {/* Artifact B Profile */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold font-mono">
                Artifact B (Reference)
              </span>
              <div className="flex items-center space-x-1.5">
                {artifactB.isDemo ? (
                  <span className="text-[10px] bg-amber-950/60 border border-amber-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                    DEMO DATA
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-mono">
                    REAL INPUT
                  </span>
                )}
                <span className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-300 px-2 py-0.5 rounded font-mono">
                  {artifactB.releaseRecord?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-base font-semibold text-white truncate">
                {artifactB.fileName}
              </div>
              <div className="text-xs text-gray-400">
                Size: <span className="text-gray-200">{artifactB.fileSize} bytes</span>
              </div>
              <div className="text-xs text-gray-400 truncate">
                Publisher:{" "}
                <span className="text-cyan-400">
                  {artifactB.manifest?.publisherId ??
                    artifactB.releaseRecord?.publisherId ??
                    "Unregistered"}
                </span>
              </div>
              <div className="text-xs text-gray-400 truncate font-mono">
                SHA-256: <span className="text-gray-300">{artifactB.sha256}</span>
              </div>
              {artifactB.releaseRecord && (
                <div className="text-[11px] text-gray-500 font-mono truncate">
                  Monad Digest: {artifactB.releaseRecord.releaseDigest}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forensic Verdict & Comparison Report */}
      {comparison && (
        <div className="space-y-6">
          <div
            className={`rounded-2xl border p-6 space-y-4 ${
              comparison.relationship === "EXACT_MATCH"
                ? "bg-emerald-950/20 border-emerald-800/60"
                : comparison.relationship === "REVOKED_VARIANT"
                ? "bg-rose-950/30 border-rose-800/80"
                : comparison.relationship === "SAME_NAME_DIFFERENT_HASH"
                ? "bg-amber-950/20 border-amber-800/60"
                : "bg-purple-950/20 border-purple-800/60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Forensic Variant Relationship
                </span>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <GitCompare className="w-5 h-5 text-purple-400" />
                  <span>{comparison.verdictTitle}</span>
                </h3>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
                {comparison.relationship}
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">{comparison.explanation}</p>

            {/* Separated Forensic Table: On-Chain Facts vs Local Comparisons */}
            <div className="pt-4 border-t border-gray-800 space-y-4">
              <div>
                <h5 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">
                  Section 1: Confirmed On-Chain Facts (Monad Testnet)
                </h5>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-2 pr-4 font-semibold">Registry Property</th>
                      <th className="py-2 px-4 font-semibold">Artifact A</th>
                      <th className="py-2 px-4 font-semibold">Artifact B</th>
                      <th className="py-2 pl-4 font-semibold text-right">Authenticated Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    <tr>
                      <td className="py-2 pr-4 text-gray-400">Monad Registry Status</td>
                      <td className="py-2 px-4 font-mono">{comparison.diff.statusA}</td>
                      <td className="py-2 px-4 font-mono">{comparison.diff.statusB}</td>
                      <td className="py-2 pl-4 text-right">
                        {comparison.diff.statusA === "REVOKED" || comparison.diff.statusB === "REVOKED" ? (
                          <span className="text-rose-400 font-semibold">Revocation Present</span>
                        ) : comparison.diff.statusA === "ACTIVE" && comparison.diff.statusB === "ACTIVE" ? (
                          <span className="text-emerald-400 font-semibold">Both Active</span>
                        ) : (
                          <span className="text-gray-400">Status Verified</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-400">Publisher Identity</td>
                      <td className="py-2 px-4 truncate max-w-[140px]">
                        {artifactA?.manifest?.publisherId ?? artifactA?.releaseRecord?.publisherId ?? "Unregistered"}
                      </td>
                      <td className="py-2 px-4 truncate max-w-[140px]">
                        {artifactB?.manifest?.publisherId ?? artifactB?.releaseRecord?.publisherId ?? "Unregistered"}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        {comparison.diff.publisherMatch ? (
                          <span className="text-emerald-400 font-semibold">Identical Publisher</span>
                        ) : (
                          <span className="text-amber-400">Different Publishers</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-400">On-Chain Lineage Link</td>
                      <td className="py-2 px-4 truncate max-w-[140px] font-mono text-[10px]">
                        {artifactA?.releaseRecord?.previousReleaseDigest ?? "None"}
                      </td>
                      <td className="py-2 px-4 truncate max-w-[140px] font-mono text-[10px]">
                        {artifactB?.releaseRecord?.previousReleaseDigest ?? "None"}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        {comparison.diff.onChainLineageVerified ? (
                          <span className="text-emerald-400 font-semibold">
                            Confirmed Lineage ({comparison.diff.onChainPredecessor} is predecessor)
                          </span>
                        ) : (
                          <span className="text-gray-500">No Direct Link</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">
                  Section 2: Local Cryptographic & File Comparisons
                </h5>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-2 pr-4 font-semibold">Local Metric</th>
                      <th className="py-2 px-4 font-semibold">Artifact A</th>
                      <th className="py-2 px-4 font-semibold">Artifact B</th>
                      <th className="py-2 pl-4 font-semibold text-right">Local Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    <tr>
                      <td className="py-2 pr-4 text-gray-400">Display Filename</td>
                      <td className="py-2 px-4 truncate max-w-[140px] font-mono">{artifactA?.fileName}</td>
                      <td className="py-2 px-4 truncate max-w-[140px] font-mono">{artifactB?.fileName}</td>
                      <td className="py-2 pl-4 text-right">
                        {comparison.diff.fileNameMatch ? (
                          <span className="text-emerald-400 font-semibold">Identical Filename</span>
                        ) : (
                          <span className="text-gray-400">Different Filenames</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-400">Whole-File SHA-256</td>
                      <td className="py-2 px-4 truncate max-w-[140px] font-mono">{artifactA?.sha256.slice(0, 16)}...</td>
                      <td className="py-2 px-4 truncate max-w-[140px] font-mono">{artifactB?.sha256.slice(0, 16)}...</td>
                      <td className="py-2 pl-4 text-right">
                        {comparison.diff.hashMatch ? (
                          <span className="text-emerald-400 font-semibold">Exact Byte Match</span>
                        ) : (
                          <span className="text-amber-400 font-semibold">Byte Mismatch</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-400">File Size</td>
                      <td className="py-2 px-4">{artifactA?.fileSize} B</td>
                      <td className="py-2 px-4">{artifactB?.fileSize} B</td>
                      <td className="py-2 pl-4 text-right">
                        {comparison.diff.sizeMatch ? (
                          <span className="text-emerald-400">Equal Size</span>
                        ) : (
                          <span className="text-gray-400">Δ {comparison.diff.sizeDeltaBytes} B</span>
                        )}
                      </td>
                    </tr>
                    {comparison.diff.chunkDiff && (
                      <tr>
                        <td className="py-2 pr-4 text-gray-400">Piece / Chunk Diff</td>
                        <td className="py-2 px-4" colSpan={2}>
                          {comparison.diff.chunkDiff.identicalChunks} / {comparison.diff.chunkDiff.chunksA} identical pieces
                        </td>
                        <td className="py-2 pl-4 text-right">
                          <span className="text-amber-400 font-semibold">
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

          {/* Visual Lineage Timeline Component */}
          <LineageTimeline
            nodes={comparison.lineageNodes}
            edges={comparison.lineageEdges}
          />
        </div>
      )}
    </div>
  );
}
