"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Upload,
  Search,
  Copy,
  CheckCheck,
  ExternalLink,
  Layers,
  Info,
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
  const [mode, setMode] = useState<"live" | "demo">("demo");
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
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
            mode === "demo"
              ? "bg-white text-neutral-900 border-t border-x border-neutral-200"
              : "text-neutral-500 hover:text-neutral-900"
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
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
            mode === "live"
              ? "bg-white text-neutral-900 border-t border-x border-neutral-200"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Live on-chain lookup
        </button>
      </div>

      {/* Preset selector for demo mode */}
      {mode === "demo" && (
        <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-900">
              Sample scenarios (Demo data):
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("same-name-different-hash")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activePreset === "same-name-different-hash"
                  ? "bg-black text-white font-medium"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              Same name, different hash (Untrusted repack)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("bit-rot-tampered")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activePreset === "bit-rot-tampered"
                  ? "bg-black text-white font-medium"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              1-piece modification (Chunk diff)
            </button>

            <button
              type="button"
              onClick={() => applyPreset("revoked-evolution")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activePreset === "revoked-evolution"
                  ? "bg-black text-white font-medium"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              Version evolution &amp; revocation
            </button>

            <button
              type="button"
              onClick={() => applyPreset("exact-match")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activePreset === "exact-match"
                  ? "bg-black text-white font-medium"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
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
          <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-2">
            <div className="font-semibold text-neutral-900 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-neutral-500" />
              <span>Monad Testnet registry status</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              The live contract at <code className="text-neutral-900 font-mono">{registryAddress.slice(0, 10)}...{registryAddress.slice(-6)}</code> currently has no public release records registered. You can query custom hashes below, or{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("demo");
                  applyPreset("same-name-different-hash");
                }}
                className="text-neutral-900 font-semibold underline hover:no-underline"
              >
                load sample data to preview comparison forensics
              </button>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Artifact A */}
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
              <div className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                Artifact A (Candidate)
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-neutral-600 block mb-1">Local file:</label>
                  <input
                    type="file"
                    onChange={(e) => setInputAFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-neutral-600 block mb-1">Or SHA-256 / Release digest:</label>
                  <input
                    type="text"
                    placeholder="0x... or 64-char hex"
                    value={inputAHashOrDigest}
                    onChange={(e) => setInputAHashOrDigest(e.target.value)}
                    className="w-full rounded bg-white border border-neutral-200 px-3 py-1.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-neutral-600 block mb-1">Signed manifest JSON (Optional):</label>
                  <textarea
                    rows={2}
                    placeholder="Paste manifest JSON..."
                    value={inputAManifestText}
                    onChange={(e) => setInputAManifestText(e.target.value)}
                    className="w-full rounded bg-white border border-neutral-200 p-2 font-mono text-[11px] text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Artifact B */}
            <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
              <div className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                Artifact B (Reference)
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-neutral-600 block mb-1">Local file:</label>
                  <input
                    type="file"
                    onChange={(e) => setInputBFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-neutral-300 file:text-xs file:bg-white file:text-neutral-900 hover:file:bg-neutral-50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-neutral-600 block mb-1">Or SHA-256 / Release digest:</label>
                  <input
                    type="text"
                    placeholder="0x... or 64-char hex"
                    value={inputBHashOrDigest}
                    onChange={(e) => setInputBHashOrDigest(e.target.value)}
                    className="w-full rounded bg-white border border-neutral-200 px-3 py-1.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-neutral-600 block mb-1">Signed manifest JSON (Optional):</label>
                  <textarea
                    rows={2}
                    placeholder="Paste manifest JSON..."
                    value={inputBManifestText}
                    onChange={(e) => setInputBManifestText(e.target.value)}
                    className="w-full rounded bg-white border border-neutral-200 p-2 font-mono text-[11px] text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isProcessingLive}
              className="px-6 py-2.5 rounded-md bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-medium text-xs transition-colors flex items-center space-x-2"
            >
              <span>{isProcessingLive ? "Comparing..." : "Compare artifacts"}</span>
            </button>
          </div>

          {liveErrorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-center space-x-2">
              <X className="w-4 h-4 text-red-700 shrink-0" />
              <span>{liveErrorMessage}</span>
            </div>
          )}
        </form>
      )}

      {/* Artifact Profiles */}
      {artifactA && artifactB && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card A */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold font-mono">
                Artifact A (Candidate)
              </span>
              <div className="flex items-center space-x-1.5">
                {artifactA.isDemo && (
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                    Demo data
                  </span>
                )}
                <span className="text-[10px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200 font-mono">
                  {artifactA.releaseRecord?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-neutral-900 truncate">{artifactA.fileName}</div>
              <div className="text-neutral-600">Size: {artifactA.fileSize.toLocaleString()} bytes</div>
              <div className="text-neutral-600 truncate">
                Publisher: <span className="text-neutral-900 font-medium">{artifactA.manifest?.publisherId ?? "Unregistered"}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] gap-2">
                <span className="truncate text-neutral-800">SHA: {artifactA.sha256}</span>
                <button
                  type="button"
                  onClick={() => copyText("artA", artifactA.sha256)}
                  className="text-neutral-400 hover:text-neutral-900 shrink-0 p-0.5"
                  title="Copy hash"
                >
                  {copiedKey === "artA" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card B */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold font-mono">
                Artifact B (Reference)
              </span>
              <div className="flex items-center space-x-1.5">
                {artifactB.isDemo && (
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                    Demo data
                  </span>
                )}
                <span className="text-[10px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200 font-mono">
                  {artifactB.releaseRecord?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-neutral-900 truncate">{artifactB.fileName}</div>
              <div className="text-neutral-600">Size: {artifactB.fileSize.toLocaleString()} bytes</div>
              <div className="text-neutral-600 truncate">
                Publisher: <span className="text-neutral-900 font-medium">{artifactB.manifest?.publisherId ?? "Unregistered"}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] gap-2">
                <span className="truncate text-neutral-800">SHA: {artifactB.sha256}</span>
                <button
                  type="button"
                  onClick={() => copyText("artB", artifactB.sha256)}
                  className="text-neutral-400 hover:text-neutral-900 shrink-0 p-0.5"
                  title="Copy hash"
                >
                  {copiedKey === "artB" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <div className="space-y-6">
          <div className="p-5 rounded-lg border border-neutral-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  Forensic relationship
                </span>
                <h3 className="text-base font-bold text-neutral-900">{comparison.verdictTitle}</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                {comparison.relationship}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">{comparison.explanation}</p>

            {/* Comparison Metrics Table */}
            <div className="pt-3 border-t border-neutral-100 space-y-4">
              <div>
                <h5 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2">
                  On-chain commitments &amp; status
                </h5>
                <div className="rounded border border-neutral-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Property</th>
                        <th className="py-2 px-3 font-semibold">Artifact A</th>
                        <th className="py-2 px-3 font-semibold">Artifact B</th>
                        <th className="py-2 px-3 font-semibold text-right">Evaluation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      <tr>
                        <td className="py-2 px-3 text-neutral-500">Registry status</td>
                        <td className="py-2 px-3 font-mono">{comparison.diff.statusA}</td>
                        <td className="py-2 px-3 font-mono">{comparison.diff.statusB}</td>
                        <td className="py-2 px-3 text-right">
                          {comparison.diff.statusA === "REVOKED" || comparison.diff.statusB === "REVOKED" ? (
                            <span className="text-red-700 font-medium">Revocation present</span>
                          ) : comparison.diff.statusA === "ACTIVE" && comparison.diff.statusB === "ACTIVE" ? (
                            <span className="text-emerald-700 font-medium">Both active</span>
                          ) : (
                            <span className="text-neutral-500">Status verified</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-neutral-500">Publisher identity</td>
                        <td className="py-2 px-3 truncate max-w-[140px]">
                          {artifactA?.manifest?.publisherId ?? "Unregistered"}
                        </td>
                        <td className="py-2 px-3 truncate max-w-[140px]">
                          {artifactB?.manifest?.publisherId ?? "Unregistered"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {comparison.diff.publisherMatch ? (
                            <span className="text-emerald-700 font-medium">Identical publisher</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Different publishers</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2">
                  Local cryptographic comparison
                </h5>
                <div className="rounded border border-neutral-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Metric</th>
                        <th className="py-2 px-3 font-semibold">Artifact A</th>
                        <th className="py-2 px-3 font-semibold">Artifact B</th>
                        <th className="py-2 px-3 font-semibold text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      <tr>
                        <td className="py-2 px-3 text-neutral-500">Filename</td>
                        <td className="py-2 px-3 font-mono truncate max-w-[140px]">{artifactA?.fileName}</td>
                        <td className="py-2 px-3 font-mono truncate max-w-[140px]">{artifactB?.fileName}</td>
                        <td className="py-2 px-3 text-right">
                          {comparison.diff.fileNameMatch ? (
                            <span className="text-neutral-800 font-medium">Same name</span>
                          ) : (
                            <span className="text-neutral-500">Different name</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-neutral-500">SHA-256 hash</td>
                        <td className="py-2 px-3 font-mono truncate max-w-[140px]">{artifactA?.sha256.slice(0, 16)}...</td>
                        <td className="py-2 px-3 font-mono truncate max-w-[140px]">{artifactB?.sha256.slice(0, 16)}...</td>
                        <td className="py-2 px-3 text-right">
                          {comparison.diff.hashMatch ? (
                            <span className="text-emerald-700 font-medium">Exact byte match</span>
                          ) : (
                            <span className="text-red-700 font-medium">Byte mismatch</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-neutral-500">File size</td>
                        <td className="py-2 px-3">{artifactA?.fileSize.toLocaleString()} B</td>
                        <td className="py-2 px-3">{artifactB?.fileSize.toLocaleString()} B</td>
                        <td className="py-2 px-3 text-right">
                          {comparison.diff.sizeMatch ? (
                            <span className="text-neutral-800 font-medium">Equal size</span>
                          ) : (
                            <span className="text-neutral-500">Δ {comparison.diff.sizeDeltaBytes} B</span>
                          )}
                        </td>
                      </tr>
                      {comparison.diff.chunkDiff && (
                        <tr>
                          <td className="py-2 px-3 text-neutral-500">Piece / Chunk diff</td>
                          <td className="py-2 px-3" colSpan={2}>
                            {comparison.diff.chunkDiff.identicalChunks} / {comparison.diff.chunkDiff.chunksA} identical pieces
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-amber-700 font-medium">
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

          {/* Visual lineage graph */}
          <LineageTimeline
            nodes={comparison.lineageNodes}
            edges={comparison.lineageEdges}
          />
        </div>
      )}
    </div>
  );
}
