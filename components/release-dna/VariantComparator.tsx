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
import { sha256Bytes, hashChunks } from "@/lib/crypto/hashing";
import { LineageTimeline } from "./LineageTimeline";

export function VariantComparator() {
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [comparison, setComparison] = useState<ReleaseDnaComparison | null>(null);

  const [artifactA, setArtifactA] = useState<ArtifactProfile | null>(null);
  const [artifactB, setArtifactB] = useState<ArtifactProfile | null>(null);
  const [activePreset, setActivePreset] = useState<string>("same-name-different-hash");

  useEffect(() => {
    async function loadFixtures() {
      const items = await getDemoFixtures();
      setFixtures(items);

      // Default preset: Authentic Ubuntu vs Repacked Clone
      applyPreset("same-name-different-hash", items);
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

  return (
    <div className="space-y-8">
      {/* Preset Selector */}
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

      {/* Side-by-side Artifact Cards */}
      {artifactA && artifactB && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Artifact A */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold font-mono">
                Artifact A (Candidate)
              </span>
              <span className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-300 px-2 py-0.5 rounded font-mono">
                {artifactA.releaseRecord?.status ?? "UNKNOWN"}
              </span>
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
                  {artifactA.manifest?.publisherId ?? "Unregistered"}
                </span>
              </div>
              <div className="text-xs text-gray-400 truncate font-mono">
                SHA-256: <span className="text-gray-300">{artifactA.sha256}</span>
              </div>
            </div>
          </div>

          {/* Artifact B */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold font-mono">
                Artifact B (Reference)
              </span>
              <span className="text-[10px] bg-purple-950/60 border border-purple-800 text-purple-300 px-2 py-0.5 rounded font-mono">
                {artifactB.releaseRecord?.status ?? "UNKNOWN"}
              </span>
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
                  {artifactB.manifest?.publisherId ?? "Unregistered"}
                </span>
              </div>
              <div className="text-xs text-gray-400 truncate font-mono">
                SHA-256: <span className="text-gray-300">{artifactB.sha256}</span>
              </div>
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

            {/* Forensic Diff Table */}
            <div className="pt-4 border-t border-gray-800 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-2 pr-4 font-semibold">Attribute</th>
                    <th className="py-2 px-4 font-semibold">Artifact A</th>
                    <th className="py-2 px-4 font-semibold">Artifact B</th>
                    <th className="py-2 pl-4 font-semibold text-right">Forensic Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-300">
                  <tr>
                    <td className="py-2.5 pr-4 text-gray-400 font-medium">Filename</td>
                    <td className="py-2.5 px-4 font-mono truncate max-w-[140px]">
                      {artifactA?.fileName}
                    </td>
                    <td className="py-2.5 px-4 font-mono truncate max-w-[140px]">
                      {artifactB?.fileName}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {comparison.diff.fileNameMatch ? (
                        <span className="text-emerald-400 font-semibold">Identical Filename</span>
                      ) : (
                        <span className="text-gray-400">Different Names</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 pr-4 text-gray-400 font-medium">Content Digest (SHA-256)</td>
                    <td className="py-2.5 px-4 font-mono truncate max-w-[140px]">
                      {artifactA?.sha256.slice(0, 16)}...
                    </td>
                    <td className="py-2.5 px-4 font-mono truncate max-w-[140px]">
                      {artifactB?.sha256.slice(0, 16)}...
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {comparison.diff.hashMatch ? (
                        <span className="text-emerald-400 font-semibold">Byte Match</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Different Bytes</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 pr-4 text-gray-400 font-medium">File Size</td>
                    <td className="py-2.5 px-4">{artifactA?.fileSize} B</td>
                    <td className="py-2.5 px-4">{artifactB?.fileSize} B</td>
                    <td className="py-2.5 pl-4 text-right">
                      {comparison.diff.sizeMatch ? (
                        <span className="text-emerald-400">Equal Size</span>
                      ) : (
                        <span className="text-gray-400">
                          Δ {comparison.diff.sizeDeltaBytes} B
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 pr-4 text-gray-400 font-medium">Monad Status</td>
                    <td className="py-2.5 px-4 font-mono">{comparison.diff.statusA}</td>
                    <td className="py-2.5 px-4 font-mono">{comparison.diff.statusB}</td>
                    <td className="py-2.5 pl-4 text-right">
                      {comparison.diff.statusA === "REVOKED" || comparison.diff.statusB === "REVOKED" ? (
                        <span className="text-rose-400 font-semibold">Revocation Present</span>
                      ) : (
                        <span className="text-gray-400">Non-revoked</span>
                      )}
                    </td>
                  </tr>

                  {comparison.diff.chunkDiff && (
                    <tr>
                      <td className="py-2.5 pr-4 text-gray-400 font-medium">Piece / Chunk Diff</td>
                      <td className="py-2.5 px-4" colSpan={2}>
                        {comparison.diff.chunkDiff.identicalChunks} / {comparison.diff.chunkDiff.chunksA} identical pieces
                      </td>
                      <td className="py-2.5 pl-4 text-right">
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
