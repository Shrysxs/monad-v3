"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  FileCheck2,
  FileJson,
  RefreshCw,
  ChevronDown,
  X,
  Sparkles,
  Equal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { compareArtifacts, type ArtifactProfile, type ReleaseDnaComparison } from "@/lib/risk/release-dna";
import { getDemoFixtures, type DemoFixtureItem } from "@/lib/demo-data/fixtures";
import { buildArtifactProfile } from "@/lib/risk/artifact-profile";
import { hashFile } from "@/lib/crypto/hash-file";
import { parseAndValidateManifest } from "@/lib/manifests/manifest";
import { resolveRegistryTrustAnchors } from "@/lib/chain/contract";
import type { ReleaseLifecycleStatus } from "@/lib/verification/types";
import { LineageTimeline } from "./LineageTimeline";

const SAMPLES: { key: string; label: string; a: string; b: string }[] = [
  { key: "impostor", label: "Real file vs. impostor copy with the same name", a: "fixture-authentic-aurora", b: "fixture-repacked-aurora" },
  { key: "corrupted", label: "Real file vs. corrupted copy", a: "fixture-authentic-aurora", b: "fixture-tampered-aurora" },
  { key: "withdrawn", label: "Older version vs. withdrawn version", a: "fixture-superseded-nimbus", b: "fixture-revoked-nimbus" },
  { key: "identical", label: "Two identical copies", a: "fixture-authentic-aurora", b: "fixture-authentic-aurora" },
];

type Tone = "good" | "warn" | "bad" | "neutral";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const STATUS_TEXT: Record<ReleaseLifecycleStatus, string> = {
  ACTIVE: "Current release",
  SUPERSEDED: "Older version",
  REVOKED: "Withdrawn by publisher",
  UNKNOWN: "Not registered",
};

/** Plain-language headline for a comparison. */
function describeComparison(c: ReleaseDnaComparison): { tone: Tone; title: string; text: string } {
  const { diff } = c;
  switch (c.relationship) {
    case "REVOKED_VARIANT": {
      const which =
        diff.statusA === "REVOKED" && diff.statusB === "REVOKED" ? "Both files are" : diff.statusA === "REVOKED" ? "File A is" : "File B is";
      return { tone: "bad", title: "One of these was withdrawn", text: `${which} from a release the publisher withdrew. Don't use it.` };
    }
    case "EXACT_MATCH":
      return { tone: "good", title: "These are the same file", text: "They're identical, byte for byte." };
    case "SUPERSEDED_VARIANT":
      return {
        tone: "warn",
        title: "One is an older version",
        text: diff.onChainLineageVerified
          ? `File ${diff.onChainPredecessor === "A" ? "B" : "A"} is the newer release that replaced the other.`
          : "Both are real releases, but one has been replaced by a newer version.",
      };
    case "VERSION_UPDATE":
      return {
        tone: "good",
        title: "Two versions of the same software",
        text: `Both are genuine releases from the same publisher (versions ${diff.versionA} and ${diff.versionB}).`,
      };
    case "SAME_NAME_DIFFERENT_HASH":
      return {
        tone: "bad",
        title: "Same name, different files",
        text:
          diff.authenticatedA !== diff.authenticatedB
            ? `They share a name but have different contents. Only File ${diff.authenticatedA ? "A" : "B"} is the publisher's real release.`
            : "They share a name but have different contents. A file name alone proves nothing about where a file came from.",
      };
    default:
      return {
        tone: "neutral",
        title: "We can't tell how these are related",
        text: "Neither file could be linked to a registered publisher, so their relationship can't be confirmed.",
      };
  }
}

const TONE_BOX: Record<Tone, { box: string; icon: React.ReactNode }> = {
  good: { box: "bg-emerald-50 border-emerald-300 text-emerald-950", icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" /> },
  warn: { box: "bg-amber-50 border-amber-300 text-amber-950", icon: <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" /> },
  bad: { box: "bg-red-50 border-red-300 text-red-950", icon: <XCircle className="w-8 h-8 text-red-600 shrink-0" /> },
  neutral: { box: "bg-neutral-50 border-neutral-300 text-neutral-900", icon: <HelpCircle className="w-8 h-8 text-neutral-500 shrink-0" /> },
};

interface Slot {
  file: File | null;
  signature: { name: string; text: string } | null;
}

function FileSlot({ title, slot, onChange }: { title: string; slot: Slot; onChange: (s: Slot) => void }) {
  const id = title.replace(/\s+/g, "-").toLowerCase();
  const box = (filled: boolean) =>
    `flex items-center gap-3 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors ${
      filled ? "border-emerald-300 bg-emerald-50/50" : "border-neutral-300 hover:border-neutral-500 bg-neutral-50/60"
    }`;
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-neutral-950">{title}</div>
      <label htmlFor={`${id}-file`} className={box(!!slot.file)}>
        <input
          id={`${id}-file`}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onChange({ ...slot, file: e.target.files[0] })}
        />
        {slot.file ? <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <Upload className="w-5 h-5 text-neutral-600 shrink-0" />}
        <span className="min-w-0 text-sm">
          <span className="block font-medium text-neutral-950 truncate">{slot.file ? slot.file.name : "Choose a file"}</span>
          <span className="block text-xs text-neutral-500">{slot.file ? formatBytes(slot.file.size) : "Stays on your computer"}</span>
        </span>
      </label>
      <label htmlFor={`${id}-sig`} className={box(!!slot.signature)}>
        <input
          id={`${id}-sig`}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) onChange({ ...slot, signature: { name: f.name, text: await f.text() } });
          }}
        />
        <FileJson className={`w-5 h-5 shrink-0 ${slot.signature ? "text-emerald-600" : "text-neutral-600"}`} />
        <span className="min-w-0 text-sm">
          <span className="block font-medium text-neutral-950 truncate">
            {slot.signature ? slot.signature.name : "Add its signature file (optional)"}
          </span>
          <span className="block text-xs text-neutral-500">Needed to tell which file is genuine</span>
        </span>
      </label>
    </div>
  );
}

function ArtifactSummary({ label, a }: { label: string; a: ArtifactProfile }) {
  const status = a.releaseRecord?.status ?? "UNKNOWN";
  return (
    <div className="rounded-xl border border-neutral-200 p-4 space-y-2 min-w-0">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-950 truncate">{a.fileName}</div>
      <div className="text-xs text-neutral-500">{formatBytes(a.fileSize)}</div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            a.authenticated ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-neutral-50 text-neutral-600 border-neutral-200"
          }`}
        >
          {a.authenticated ? `Genuine · ${a.manifest?.publisherId}` : a.manifest ? "Publisher not confirmed" : "No signature file"}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            status === "REVOKED"
              ? "bg-red-50 text-red-800 border-red-200"
              : status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-neutral-50 text-neutral-600 border-neutral-200"
          }`}
        >
          {STATUS_TEXT[status]}
        </span>
      </div>
    </div>
  );
}

export function VariantComparator() {
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [slotA, setSlotA] = useState<Slot>({ file: null, signature: null });
  const [slotB, setSlotB] = useState<Slot>({ file: null, signature: null });
  const [comparison, setComparison] = useState<ReleaseDnaComparison | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDemoFixtures().then(setFixtures).catch(() => setFixtures([]));
  }, []);

  function update(setter: (s: Slot) => void) {
    return (s: Slot) => {
      setter(s);
      setComparison(null);
      setIsSample(false);
      setError(null);
    };
  }

  async function profileFromSlot(label: string, slot: Slot): Promise<ArtifactProfile> {
    const id = label.toLowerCase().replace(/\s+/g, "-");
    let manifest = undefined;
    let manifestDigest: string | undefined;
    if (slot.signature) {
      const parsed = await parseAndValidateManifest(slot.signature.text);
      if (!parsed.valid) throw new Error(`${label}: that signature file isn't valid. ${parsed.message}`);
      manifest = parsed.manifest;
      manifestDigest = parsed.manifestDigest;
    }
    const chunkSize = manifest && Number.isSafeInteger(manifest.chunkSize) ? manifest.chunkSize : undefined;
    const fileDigest = await hashFile(slot.file!, { chunkSize });
    if (!manifest || !manifestDigest) {
      return buildArtifactProfile({ id, fileName: slot.file!.name, fileDigest });
    }
    // Publisher key and release status come from the registry, never from the signature file.
    const anchors = await resolveRegistryTrustAnchors(manifest, manifestDigest);
    return buildArtifactProfile({
      id,
      fileName: slot.file!.name,
      fileDigest,
      manifest,
      publisher: anchors.publisher,
      onChainRecord: anchors.releaseRecord,
      trustSource: "MONAD_TESTNET",
    });
  }

  async function handleCompare() {
    if (!slotA.file || !slotB.file) {
      setError("Choose both files to compare.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([profileFromSlot("File A", slotA), profileFromSlot("File B", slotB)]);
      setComparison(compareArtifacts(a, b));
      setIsSample(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadSample(key: string) {
    const sample = SAMPLES.find((s) => s.key === key);
    const fa = fixtures.find((f) => f.id === sample?.a);
    const fb = fixtures.find((f) => f.id === sample?.b);
    if (!sample || !fa || !fb) return;
    const profile = (f: DemoFixtureItem, id: string) =>
      buildArtifactProfile({
        id,
        fileName: f.fileName,
        fileBytes: f.fileBytes,
        manifest: f.manifest,
        publisher: f.publisher,
        onChainRecord: f.releaseRecord,
        trustSource: "DEMO_FIXTURE",
      });
    const [a, b] = await Promise.all([profile(fa, "sample-a"), profile(fb, "sample-b")]);
    setSlotA({ file: null, signature: null });
    setSlotB({ file: null, signature: null });
    setComparison(compareArtifacts(a, b));
    setIsSample(true);
    setError(null);
  }

  const headline = comparison ? describeComparison(comparison) : null;
  const chunk = comparison?.diff.chunkDiff;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <FileSlot title="File A" slot={slotA} onChange={update(setSlotA)} />
          <FileSlot title="File B" slot={slotB} onChange={update(setSlotB)} />
        </div>
        <button
          type="button"
          onClick={handleCompare}
          disabled={busy || !slotA.file || !slotB.file}
          className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Equal className="w-4 h-4" />}
          {busy ? "Comparing..." : "Compare files"}
        </button>
      </div>

      {fixtures.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <Sparkles className="w-4 h-4 text-neutral-500" />
          <span>No files handy? Try a sample:</span>
          <select
            value=""
            onChange={(e) => void loadSample(e.target.value)}
            className="w-full sm:w-auto max-w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950"
          >
            <option value="" disabled>
              Choose a sample…
            </option>
            {SAMPLES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-2.5">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {comparison && headline && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className={`p-6 border-b ${TONE_BOX[headline.tone].box}`}>
              <div className="flex items-start gap-4">
                {TONE_BOX[headline.tone].icon}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{headline.title}</h2>
                    {isSample && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-current/20 font-medium">
                        Sample data
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{headline.text}</p>
                  {chunk && !comparison.diff.hashMatch && (
                    <p className="text-sm">
                      {chunk.differingChunks} of {Math.max(chunk.chunksA, chunk.chunksB)} parts differ.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 p-4">
              <ArtifactSummary label="File A" a={comparison.artifactA} />
              <ArtifactSummary label="File B" a={comparison.artifactB} />
            </div>
          </div>

          <details className="group rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-neutral-800 flex items-center justify-between">
              <span>Technical details</span>
              <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-5 pb-5 pt-4 border-t border-neutral-100 space-y-5 overflow-x-auto">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-neutral-100">
                  {[
                    ["Fingerprint (SHA-256)", comparison.artifactA.sha256, comparison.artifactB.sha256],
                    ["Size", formatBytes(comparison.artifactA.fileSize), formatBytes(comparison.artifactB.fileSize)],
                    ["Publisher (as claimed)", comparison.artifactA.manifest?.publisherId ?? "—", comparison.artifactB.manifest?.publisherId ?? "—"],
                    ["Version", comparison.diff.versionA ?? "—", comparison.diff.versionB ?? "—"],
                    ["Registry status", comparison.diff.statusA, comparison.diff.statusB],
                  ].map(([k, a, b]) => (
                    <tr key={k}>
                      <td className="py-2 pr-3 text-neutral-500 whitespace-nowrap">{k}</td>
                      <td className="py-2 pr-3 font-mono text-neutral-800 max-w-[12rem] truncate">{a}</td>
                      <td className="py-2 font-mono text-neutral-800 max-w-[12rem] truncate">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LineageTimeline nodes={comparison.lineageNodes} edges={comparison.lineageEdges} />
              <p className="text-xs text-neutral-500">Result code: {comparison.relationship}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
