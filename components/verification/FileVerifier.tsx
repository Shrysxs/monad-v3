"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  FileCheck2,
  FileJson,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  X,
  Copy,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { parseAndValidateManifest } from "@/lib/manifests/manifest";
import { hashFile } from "@/lib/crypto/hash-file";
import {
  getDemoFixtures,
  getDemoRegistryPublisher,
  type DemoFixtureItem,
} from "@/lib/demo-data/fixtures";
import { ChunkMatrix } from "./ChunkMatrix";
import { VerdictCard } from "./VerdictCard";
import { resolveRegistryTrustAnchors } from "@/lib/chain/contract";
import type {
  VerificationVerdict,
  SignedReleaseManifest,
  ReleaseRecord,
} from "@/lib/verification/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface SignatureSummary {
  ok: boolean;
  text: string;
}

export function FileVerifier() {
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [fileName, setFileName] = useState<string>("");
  // Sample bytes (small, in memory) or a user-selected File (streamed, never loaded whole)
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [manifestText, setManifestText] = useState<string>("");
  const [signatureName, setSignatureName] = useState<string>("");
  const [showPaste, setShowPaste] = useState<boolean>(false);
  const [signatureSummary, setSignatureSummary] = useState<SignatureSummary | null>(null);
  const [onChainRecord, setOnChainRecord] = useState<ReleaseRecord | undefined>(undefined);
  const [isSample, setIsSample] = useState<boolean>(false);
  const [dragTarget, setDragTarget] = useState<"file" | "signature" | null>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyingStep, setVerifyingStep] = useState<string>("");
  const [verdict, setVerdict] = useState<VerificationVerdict | null>(null);
  const [activeManifest, setActiveManifest] = useState<SignedReleaseManifest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Samples are offered, never pre-loaded: the page starts empty and waits for the user's file.
  useEffect(() => {
    getDemoFixtures()
      .then(setFixtures)
      .catch(() => setFixtures([]));
  }, []);

  // Show a one-line, human-readable summary of the signature file as soon as it's added.
  useEffect(() => {
    let cancelled = false;
    if (!manifestText.trim()) {
      setSignatureSummary(null);
      return;
    }
    parseAndValidateManifest(manifestText).then((parsed) => {
      if (cancelled) return;
      setSignatureSummary(
        parsed.valid
          ? {
              ok: true,
              text: `For ${parsed.manifest.fileName} · version ${parsed.manifest.releaseVersion} · by ${parsed.manifest.publisherId}`,
            }
          : { ok: false, text: `This doesn't look like a valid signature file. ${parsed.message}` }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [manifestText]);

  function resetResult() {
    setVerdict(null);
    setErrorMessage(null);
  }

  function loadSample(id: string) {
    const f = fixtures.find((x) => x.id === id);
    if (!f) return;
    setFileName(f.fileName);
    setFileBytes(f.fileBytes);
    setLocalFile(null);
    setManifestText(JSON.stringify(f.manifest, null, 2));
    setSignatureName(`${f.fileName}.json`);
    setOnChainRecord(f.releaseRecord);
    setActiveManifest(f.manifest);
    setIsSample(true);
    resetResult();
  }

  function clearSampleIfAny() {
    // Mixing a sample with the user's own file would give a meaningless result.
    if (!isSample) return;
    setIsSample(false);
    setFileBytes(null);
    setFileName("");
    setManifestText("");
    setSignatureName("");
    setOnChainRecord(undefined);
  }

  function chooseFile(file: File) {
    clearSampleIfAny();
    setFileName(file.name);
    setLocalFile(file);
    setFileBytes(null);
    resetResult();
  }

  async function chooseSignature(file: File) {
    try {
      const text = await file.text();
      clearSampleIfAny();
      setManifestText(text);
      setSignatureName(file.name);
      setOnChainRecord(undefined);
      resetResult();
    } catch (err) {
      setErrorMessage("Couldn't read the signature file: " + (err as Error).message);
    }
  }

  function dropHandlers(target: "file" | "signature") {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setDragTarget(target);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        setDragTarget(null);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDragTarget(null);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (target === "file") chooseFile(file);
        else void chooseSignature(file);
      },
    };
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleRunVerification() {
    if (!fileBytes && !localFile) {
      setErrorMessage("Choose the file you downloaded first.");
      return;
    }
    if (!manifestText.trim()) {
      setErrorMessage("Add the publisher's signature file (.json) to check against.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setVerdict(null);
    setVerifyingStep("Reading the signature file...");

    try {
      const parsed = await parseAndValidateManifest(manifestText);
      if (!parsed.valid) {
        setErrorMessage(`This doesn't look like a valid signature file. ${parsed.message}`);
        return;
      }
      setActiveManifest(parsed.manifest);

      // Hash the file off the main thread, in pieces of the signature file's piece size.
      const chunkSize = Number.isSafeInteger(parsed.manifest.chunkSize) ? parsed.manifest.chunkSize : undefined;
      const fileInput = localFile
        ? {
            fileDigest: await hashFile(localFile, {
              chunkSize,
              onProgress: (f) => setVerifyingStep(`Checking your file on this computer... ${Math.floor(f * 100)}%`),
            }),
          }
        : { fileBytes: fileBytes! };

      // The publisher's key and release status always come from the registry, never from input.
      let res: VerificationVerdict;
      if (isSample) {
        setVerifyingStep("Looking up the publisher...");
        res = await verifyFileAgainstManifest({
          ...fileInput,
          fileName,
          manifest: parsed.manifest,
          publisher: getDemoRegistryPublisher(parsed.manifest.publisherId),
          onChainRecord,
          trustSource: "DEMO_FIXTURE",
        });
      } else {
        setVerifyingStep("Looking up the publisher on Monad...");
        const anchors = await resolveRegistryTrustAnchors(parsed.manifest, parsed.manifestDigest);
        res = await verifyFileAgainstManifest({
          ...fileInput,
          fileName,
          manifest: parsed.manifest,
          publisher: anchors.publisher,
          onChainRecord: anchors.releaseRecord,
          networkError: anchors.networkError,
          trustSource: "MONAD_TESTNET",
        });
      }
      setVerdict(res);
    } catch (err) {
      setErrorMessage("Something went wrong while checking: " + (err as Error).message);
    } finally {
      setIsVerifying(false);
      setVerifyingStep("");
    }
  }

  const fileSize = localFile ? localFile.size : fileBytes ? fileBytes.byteLength : 0;
  const hasFile = !!(fileBytes || localFile);
  const hasSignature = !!manifestText.trim();

  const zone = (active: boolean, filled: boolean) =>
    `flex items-center gap-4 rounded-xl border-2 border-dashed p-5 transition-colors cursor-pointer ${
      active
        ? "border-neutral-900 bg-neutral-100"
        : filled
        ? "border-emerald-300 bg-emerald-50/50"
        : "border-neutral-300 hover:border-neutral-500 bg-neutral-50/60"
    }`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        {/* Step 1 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-950">
            <span className="text-neutral-400 mr-1.5">1.</span>The file you downloaded
          </div>
          <label htmlFor="file-upload" className={zone(dragTarget === "file", hasFile)} {...dropHandlers("file")}>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && chooseFile(e.target.files[0])}
            />
            <span className="w-11 h-11 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0">
              {hasFile ? <FileCheck2 className="w-5 h-5 text-emerald-600" /> : <Upload className="w-5 h-5 text-neutral-700" />}
            </span>
            <span className="min-w-0">
              {hasFile ? (
                <>
                  <span className="block text-sm font-medium text-neutral-950 truncate">{fileName}</span>
                  <span className="block text-xs text-neutral-500">
                    {formatBytes(fileSize)}
                    {isSample ? " · sample" : ""} · click to choose a different file
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-sm font-medium text-neutral-950">Drop the file here, or click to choose</span>
                  <span className="block text-xs text-neutral-500">Any size. It stays on your computer — nothing is uploaded.</span>
                </>
              )}
            </span>
          </label>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-950">
            <span className="text-neutral-400 mr-1.5">2.</span>The publisher&apos;s signature file
          </div>
          <label
            htmlFor="signature-upload"
            className={zone(dragTarget === "signature", hasSignature && signatureSummary?.ok !== false)}
            {...dropHandlers("signature")}
          >
            <input
              type="file"
              id="signature-upload"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void chooseSignature(e.target.files[0])}
            />
            <span className="w-11 h-11 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0">
              <FileJson className={`w-5 h-5 ${hasSignature ? "text-emerald-600" : "text-neutral-700"}`} />
            </span>
            <span className="min-w-0">
              {hasSignature ? (
                <>
                  <span className="block text-sm font-medium text-neutral-950 truncate">
                    {signatureName || "Pasted signature"}
                  </span>
                  <span className="block text-xs text-neutral-500 truncate">
                    {signatureSummary?.ok ? signatureSummary.text : "Click to choose a different file"}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-sm font-medium text-neutral-950">Drop the .json signature file here</span>
                  <span className="block text-xs text-neutral-500">
                    Publishers offer it next to the download. It proves who made the file.
                  </span>
                </>
              )}
            </span>
          </label>
          {signatureSummary && !signatureSummary.ok && (
            <p className="text-xs text-red-700">{signatureSummary.text}</p>
          )}
          <button
            type="button"
            onClick={() => setShowPaste((v) => !v)}
            className="text-xs text-neutral-600 hover:text-neutral-950 underline underline-offset-2"
          >
            {showPaste ? "Hide text box" : "Or paste the signature text instead"}
          </button>
          {showPaste && (
            <textarea
              rows={5}
              value={manifestText}
              onChange={(e) => {
                clearSampleIfAny();
                setManifestText(e.target.value);
                setSignatureName("");
                resetResult();
              }}
              className="w-full rounded-lg border border-neutral-200 p-3 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-950"
              placeholder='{ "schemaVersion": "1.0.0", ... }'
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleRunVerification}
          disabled={isVerifying || !hasFile || !hasSignature}
          className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{verifyingStep || "Checking..."}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Check file</span>
            </>
          )}
        </button>
      </div>

      {/* Samples: secondary, clearly labelled */}
      {fixtures.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <Sparkles className="w-4 h-4 text-neutral-500" />
          <span>No file handy? Try a sample:</span>
          <select
            value=""
            onChange={(e) => loadSample(e.target.value)}
            className="w-full sm:w-auto max-w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950"
          >
            <option value="" disabled>
              Choose a sample…
            </option>
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-2.5">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {verdict && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <VerdictCard verdict={verdict} />

          <details className="group rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-neutral-800 flex items-center justify-between">
              <span>Technical details</span>
              <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-5 pb-5 space-y-5 border-t border-neutral-100 pt-4">
              <dl className="space-y-3 text-xs">
                {[
                  ["Your file's fingerprint (SHA-256)", verdict.fileIntegrity.computedSha256],
                  ["Expected fingerprint", verdict.fileIntegrity.expectedSha256 ?? ""],
                  ["Publisher key used (Ed25519)", verdict.signatureVerification.publicKeyUsed || "None — publisher not registered"],
                  ...(verdict.releaseRecord ? [["Registry record", verdict.releaseRecord.releaseDigest]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <dt className="text-neutral-500">{label}</dt>
                    <dd className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 font-mono text-neutral-800">
                      <span className="truncate">{value}</span>
                      {value && (
                        <button
                          type="button"
                          onClick={() => copyText(label, value)}
                          className="text-neutral-400 hover:text-neutral-950 shrink-0"
                          title="Copy"
                        >
                          {copiedKey === label ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {verdict.fileIntegrity.chunkDetails && verdict.fileIntegrity.chunkDetails.length > 0 && (
                <ChunkMatrix
                  chunkDetails={verdict.fileIntegrity.chunkDetails}
                  chunkSize={activeManifest?.chunkSize ?? 16}
                  totalChunks={verdict.fileIntegrity.chunksTotal ?? 0}
                  matchedChunks={verdict.fileIntegrity.chunksMatched ?? 0}
                />
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-neutral-800">Step-by-step log</div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-600">
                  {verdict.explanations.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ol>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-neutral-800">What this check does not prove</div>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-600">
                  {verdict.caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
