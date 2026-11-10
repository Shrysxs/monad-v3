"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  FileCode,
  Check,
  X,
  AlertTriangle,
  Info,
  Copy,
  CheckCheck,
  ChevronDown,
  Layers,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  FileCheck2,
  RefreshCw,
  ExternalLink,
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
import {
  resolveRegistryTrustAnchors,
  getRegistryAddress,
} from "@/lib/chain/contract";
import type {
  VerificationVerdict,
  SignedReleaseManifest,
  ReleaseRecord,
} from "@/lib/verification/types";

export function FileVerifier() {
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("fixture-authentic-aurora");
  const [fileName, setFileName] = useState<string>("");
  // Fixture bytes (small, in memory) or a user-selected File (streamed, never loaded whole)
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [manifestText, setManifestText] = useState<string>("");
  const [onChainRecord, setOnChainRecord] = useState<ReleaseRecord | undefined>(undefined);
  const [isDemoData, setIsDemoData] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyingStep, setVerifyingStep] = useState<string>("");
  const [verdict, setVerdict] = useState<VerificationVerdict | null>(null);
  const [activeManifest, setActiveManifest] = useState<SignedReleaseManifest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const contractAddress = getRegistryAddress();

  // Load demo fixtures on mount
  useEffect(() => {
    async function loadFixtures() {
      try {
        const loaded = await getDemoFixtures();
        setFixtures(loaded);
        if (loaded.length > 0) {
          selectFixture(loaded[0]);
        }
      } catch (err) {
        console.error("Failed to load demo fixtures", err);
      }
    }
    loadFixtures();
  }, []);

  function selectFixture(f: DemoFixtureItem) {
    setSelectedFixtureId(f.id);
    setFileName(f.fileName);
    setFileBytes(f.fileBytes);
    setLocalFile(null);
    setManifestText(JSON.stringify(f.manifest, null, 2));
    setOnChainRecord(f.releaseRecord);
    setActiveManifest(f.manifest);
    setIsDemoData(true);
    setVerdict(null);
    setErrorMessage(null);
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Handle local user file upload
  // Keep only the File handle: it is streamed from disk in a Web Worker at verification time.
  function processSelectedFile(file: File) {
    setFileName(file.name);
    setLocalFile(file);
    setFileBytes(null);
    setIsDemoData(false);
    setSelectedFixtureId("custom");
    setOnChainRecord(undefined);
    setVerdict(null);
    setErrorMessage(null);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  }

  // Handle local manifest upload
  async function handleManifestUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setManifestText(text);
      setIsDemoData(false);
      setSelectedFixtureId("custom");
      setOnChainRecord(undefined);
      setVerdict(null);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage("Could not read manifest file: " + (err as Error).message);
    }
  }

  async function handleRunVerification() {
    if (!fileBytes && !localFile) {
      setErrorMessage("Please select or drop a target file.");
      return;
    }
    if (!manifestText.trim()) {
      setErrorMessage("Please provide a signed release manifest JSON.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setVerifyingStep("Parsing and canonicalizing RFC 8785 manifest...");

    try {
      // 1. Validate manifest JSON
      const parsed = await parseAndValidateManifest(manifestText);
      if (!parsed.valid) {
        setErrorMessage(parsed.message);
        setIsVerifying(false);
        return;
      }

      setActiveManifest(parsed.manifest);

      // 2. Resolve the trusted publisher key and release record from the registry.
      //    The verification key is never taken from user input: it comes from the
      //    registry entry for the publisherId the manifest claims.
      // Hash the selected file off the main thread, in pieces of the manifest's chunk size.
      const chunkSize = Number.isSafeInteger(parsed.manifest.chunkSize) ? parsed.manifest.chunkSize : undefined;
      const fileInput = localFile
        ? {
            fileDigest: await hashFile(localFile, {
              chunkSize,
              onProgress: (f) =>
                setVerifyingStep(`Hashing ${localFile.name} locally (SHA-256)... ${Math.floor(f * 100)}%`),
            }),
          }
        : { fileBytes: fileBytes! };

      let res: VerificationVerdict;
      if (isDemoData) {
        setVerifyingStep("Resolving publisher key from the demo registry...");
        res = await verifyFileAgainstManifest({
          ...fileInput,
          fileName,
          manifest: parsed.manifest,
          publisher: getDemoRegistryPublisher(parsed.manifest.publisherId),
          onChainRecord,
          trustSource: "DEMO_FIXTURE",
        });
      } else {
        setVerifyingStep("Resolving publisher key and release commitment on Monad Testnet...");
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
      setErrorMessage("Verification failure: " + (err as Error).message);
    } finally {
      setIsVerifying(false);
      setVerifyingStep("");
    }
  }

  // Map verdict status to one of the 7 top-level banner states
  function getBannerConfig(v: VerificationVerdict) {
    switch (v.status) {
      case "MATCHING_AUTHENTICATED_RELEASE":
        return {
          title: "Integrity match",
          style: "bg-emerald-50 border-emerald-300 text-emerald-950",
          badgeStyle: "bg-emerald-100 text-emerald-900 border-emerald-300",
          icon: <Check className="w-5 h-5 text-emerald-700 shrink-0" />,
          summary:
            "Calculated SHA-256 checksum matches the signed manifest. Publisher Ed25519 signature verified and release commitments confirmed on Monad Testnet.",
        };
      case "HASH_MISMATCH":
        return {
          title: "Hash mismatch",
          style: "bg-red-50 border-red-300 text-red-950",
          badgeStyle: "bg-red-100 text-red-900 border-red-300",
          icon: <X className="w-5 h-5 text-red-700 shrink-0" />,
          summary:
            "The computed file digest does not match the signed manifest checksum. File content has been modified, corrupted, or repacked.",
        };
      case "INVALID_MANIFEST_SIGNATURE":
        return {
          title: "Signature invalid",
          style: "bg-red-50 border-red-300 text-red-950",
          badgeStyle: "bg-red-100 text-red-900 border-red-300",
          icon: <X className="w-5 h-5 text-red-700 shrink-0" />,
          summary:
            "The Ed25519 signature does not verify against the publisher's registered key. The manifest was altered or signed by someone else.",
        };
      case "UNAUTHORIZED_KEY":
        return {
          title: "Publisher not authorized",
          style: "bg-amber-50 border-amber-300 text-amber-950",
          badgeStyle: "bg-amber-100 text-amber-900 border-amber-300",
          icon: <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />,
          summary:
            "This publisher has been deauthorized in the registry. Its signatures are no longer trusted.",
        };
      case "UNKNOWN_RELEASE":
        return {
          title: "Not registered",
          style: "bg-neutral-100 border-neutral-300 text-neutral-900",
          badgeStyle: "bg-neutral-200 text-neutral-900 border-neutral-300",
          icon: <HelpCircle className="w-5 h-5 text-neutral-600 shrink-0" />,
          summary:
            "The publisher or this exact release is not registered, so the file cannot be authenticated against a trusted key and commitment.",
        };
      case "NETWORK_ERROR":
        return {
          title: "Registry unavailable",
          style: "bg-neutral-100 border-neutral-300 text-neutral-900",
          badgeStyle: "bg-neutral-200 text-neutral-900 border-neutral-300",
          icon: <Info className="w-5 h-5 text-neutral-600 shrink-0" />,
          summary:
            "Unable to reach the Monad Testnet RPC endpoint. The publisher key and release status could not be fetched, so the manifest was not authenticated.",
        };
      case "REVOKED_RELEASE":
        return {
          title: "Release revoked",
          style: "bg-red-50 border-red-300 text-red-950",
          badgeStyle: "bg-red-100 text-red-900 border-red-300",
          icon: <X className="w-5 h-5 text-red-700 shrink-0" />,
          summary:
            "This release was officially marked as REVOKED on Monad Testnet by the publisher. Do not run or deploy this software.",
        };
      case "SUPERSEDED_RELEASE":
        return {
          title: "Release superseded",
          style: "bg-neutral-100 border-neutral-300 text-neutral-900",
          badgeStyle: "bg-neutral-200 text-neutral-900 border-neutral-300",
          icon: <Info className="w-5 h-5 text-neutral-600 shrink-0" />,
          summary:
            "This release is authentic but has been superseded by a newer version registered on Monad Testnet.",
        };
      default:
        return {
          title: "Incomplete verification",
          style: "bg-amber-50 border-amber-300 text-amber-950",
          badgeStyle: "bg-amber-100 text-amber-900 border-amber-300",
          icon: <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />,
          summary: v.summary || "One or more verification steps could not be completed.",
        };
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-8">
      {/* Sample Fixtures Bar */}
      <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-neutral-950 uppercase tracking-wider text-[11px] font-mono">
            Sample Scenarios:
          </span>
          <span className="text-neutral-500 hidden sm:inline">Load signed test fixtures:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fixtures.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFixture(f)}
              className={`px-3 py-1 rounded text-xs transition-all duration-150 ${
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

      {/* Main Dual Inputs: Target File & Manifest */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Interactive Target File Drop Zone */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-900" />
                <span>1. Target File</span>
              </h3>
              {isDemoData ? (
                <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200 font-mono font-medium">
                  Fixture
                </span>
              ) : (
                <span className="text-[10px] bg-neutral-900 text-white px-2 py-0.5 rounded font-mono font-medium">
                  Local File
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              The artifact to be checked. Hashed locally via Web Crypto SHA-256.
            </p>
          </div>

          {/* Deliberate Interactive Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-neutral-900 bg-neutral-100/70 scale-[0.99]"
                : "border-neutral-300 hover:border-neutral-400 bg-neutral-50/60 hover:bg-neutral-50"
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-xs text-neutral-600"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-1">
                <Upload className="w-5 h-5" />
              </div>
              <span className="font-semibold text-neutral-950 text-sm">
                Drop file here or click to browse
              </span>
              <span className="text-[11px] text-neutral-500 max-w-xs">
                Zero upload — binary bytes never leave your browser memory.
              </span>
            </label>
          </div>

          {/* Selected File Details Strip */}
          {fileName ? (
            <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs font-mono space-y-1">
              <div className="text-neutral-950 font-bold truncate flex items-center justify-between">
                <span className="truncate">{fileName}</span>
                <span className="text-[10px] font-normal text-neutral-500 font-sans ml-2 shrink-0">
                  {localFile ? formatBytes(localFile.size) : fileBytes ? formatBytes(fileBytes.byteLength) : "0 B"}
                </span>
              </div>
              <div className="text-neutral-500 text-[10px]">
                Ready for Web Crypto SHA-256 digest computation
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-neutral-200 text-xs text-neutral-400 font-mono text-center">
              No file selected yet
            </div>
          )}
        </div>

        {/* Card 2: Release Manifest & Publisher Key */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-900" />
                <span>2. Manifest &amp; Key</span>
              </h3>
              <label
                htmlFor="manifest-upload"
                className="cursor-pointer text-[11px] font-medium text-neutral-900 hover:underline flex items-center space-x-1"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-700" />
                <span>Upload .json</span>
                <input
                  type="file"
                  id="manifest-upload"
                  accept=".json"
                  className="hidden"
                  onChange={handleManifestUpload}
                />
              </label>
            </div>
            <p className="text-xs text-neutral-500">
              Publisher-signed RFC 8785 release manifest.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 leading-relaxed">
              The publisher&apos;s Ed25519 key is looked up in the {isDemoData ? "demo registry" : "Monad Testnet registry"} by
              the manifest&apos;s <code className="font-mono">publisherId</code>. It is never taken from the manifest or typed in.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700">Signed manifest JSON:</label>
              <textarea
                rows={4}
                value={manifestText}
                onChange={(e) => setManifestText(e.target.value)}
                className="w-full rounded-md bg-white border border-neutral-200 p-2.5 text-[11px] font-mono text-neutral-900 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 resize-none"
                placeholder="Paste RFC 8785 signed manifest JSON..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Verify Action Button */}
      <div className="flex flex-col items-center justify-center space-y-2 pt-2">
        <button
          type="button"
          onClick={handleRunVerification}
          disabled={isVerifying || (!fileBytes && !localFile)}
          className="px-8 py-3.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-semibold text-sm transition-all shadow-md active:scale-[0.99] flex items-center space-x-2"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying release...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Verify file</span>
            </>
          )}
        </button>

        {isVerifying && (
          <div className="text-xs font-mono text-neutral-600 animate-pulse">
            {verifyingStep || "Processing..."}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-300 text-red-950 text-xs flex items-center space-x-2.5">
          <X className="w-4 h-4 text-red-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Verification Result Display */}
      {verdict && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top-Level High-Contrast Verdict Banner */}
          {(() => {
            const banner = getBannerConfig(verdict);
            return (
              <div className={`p-6 rounded-xl border ${banner.style} space-y-3 shadow-sm`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    {banner.icon}
                    <h2 className="text-lg font-bold tracking-tight">{banner.title}</h2>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-mono font-bold border ${banner.badgeStyle}`}
                  >
                    {verdict.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed max-w-3xl font-medium">
                  {banner.summary}
                </p>
                {verdict.trustSource === "DEMO_FIXTURE" && (
                  <p className="mt-2 text-[11px] font-mono opacity-80">
                    Demo mode: publisher keys and release records come from local fixtures, not Monad Testnet.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Structured 5-Check Differentiated Sections */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm divide-y divide-neutral-200">
            {/* Check 1: File integrity */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold font-mono text-neutral-800">
                    1
                  </span>
                  <span className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                    File integrity
                  </span>
                </div>
                <p className="text-xs text-neutral-600 pl-8">
                  Computed whole-file SHA-256 digest vs. expected manifest declaration
                </p>
              </div>
              <div className="pl-8 sm:pl-0">
                {verdict.fileIntegrity.status === "MATCH" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Exact SHA-256 match</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-800 bg-red-50 px-3 py-1 rounded border border-red-200">
                    <X className="w-3.5 h-3.5 text-red-700" />
                    <span>Checksum mismatch</span>
                  </span>
                )}
              </div>
            </div>

            {/* Check 2: Publisher authenticity */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold font-mono text-neutral-800">
                    2
                  </span>
                  <span className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                    Publisher signature
                  </span>
                </div>
                <p className="text-xs text-neutral-600 pl-8">
                  Ed25519 signature verified over canonical RFC 8785 JSON manifest envelope
                </p>
              </div>
              <div className="pl-8 sm:pl-0">
                {verdict.signatureVerification.isValid ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Signature valid</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-800 bg-red-50 px-3 py-1 rounded border border-red-200">
                    <X className="w-3.5 h-3.5 text-red-700" />
                    <span>Signature invalid</span>
                  </span>
                )}
              </div>
            </div>

            {/* Check 3: Publisher key authorization */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold font-mono text-neutral-800">
                    3
                  </span>
                  <span className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                    Publisher authorization
                  </span>
                </div>
                <p className="text-xs text-neutral-600 pl-8">
                  Publisher signing key authorization registered on Monad Testnet contract
                </p>
              </div>
              <div className="pl-8 sm:pl-0">
                {verdict.status === "NETWORK_ERROR" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 px-3 py-1 rounded border border-neutral-200">
                    <span>Registry unreachable</span>
                  </span>
                ) : verdict.signatureVerification.status === "KEY_REVOKED" ||
                  verdict.signatureVerification.status === "KEY_UNAUTHORIZED" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Publisher deauthorized</span>
                  </span>
                ) : verdict.signatureVerification.status === "VALID" ||
                  verdict.signatureVerification.status === "INVALID" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Authorized publisher</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 px-3 py-1 rounded border border-neutral-200">
                    <span>Unregistered publisher</span>
                  </span>
                )}
              </div>
            </div>

            {/* Check 4: Registry and release status */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold font-mono text-neutral-800">
                    4
                  </span>
                  <span className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                    Registry &amp; release status
                  </span>
                </div>
                <p className="text-xs text-neutral-600 pl-8">
                  {verdict.trustSource === "DEMO_FIXTURE"
                    ? "Lifecycle commitment in the demo registry (local fixtures)"
                    : "On-chain lifecycle commitment in PenguinTraceRegistry on Monad Testnet"}
                </p>
              </div>
              <div className="pl-8 sm:pl-0">
                {verdict.releaseRecord?.status === "ACTIVE" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Active on-chain</span>
                  </span>
                ) : verdict.releaseRecord?.status === "REVOKED" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-800 bg-red-50 px-3 py-1 rounded border border-red-200">
                    <X className="w-3.5 h-3.5 text-red-700" />
                    <span>Revoked on-chain</span>
                  </span>
                ) : verdict.releaseRecord?.status === "SUPERSEDED" ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 px-3 py-1 rounded border border-neutral-300">
                    <Info className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Superseded on-chain</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 px-3 py-1 rounded border border-neutral-200">
                    <span>Unregistered release</span>
                  </span>
                )}
              </div>
            </div>

            {/* Check 5: Piece-level integrity (if chunk details available) */}
            {verdict.fileIntegrity.chunksTotal !== undefined && verdict.fileIntegrity.chunksTotal > 0 && (
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold font-mono text-neutral-800">
                      5
                    </span>
                    <span className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                      Piece-level integrity
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 pl-8">
                    Chunk-by-chunk SHA-256 verification against manifest declarations
                  </p>
                </div>
                <div className="pl-8 sm:pl-0">
                  {verdict.fileIntegrity.chunksMatched === verdict.fileIntegrity.chunksTotal ? (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{verdict.fileIntegrity.chunksTotal} of {verdict.fileIntegrity.chunksTotal} matched</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-800 bg-red-50 px-3 py-1 rounded border border-red-200">
                      <X className="w-3.5 h-3.5 text-red-700" />
                      <span>
                        {(verdict.fileIntegrity.chunksTotal ?? 0) - (verdict.fileIntegrity.chunksMatched ?? 0)} altered pieces
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* High-Contrast Selective Dark Surface for Technical Identifiers */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 text-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                Cryptographic Identifiers &amp; Evidence
              </span>
              <span className="text-[11px] font-mono text-neutral-500">SHA-256 · Ed25519 · keccak256</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Computed Hash */}
              <div className="space-y-1">
                <div className="text-[11px] text-neutral-400 font-sans">Computed File SHA-256 (Local Web Crypto):</div>
                <div className="flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] gap-2">
                  <span className="truncate text-emerald-400">{verdict.fileIntegrity.computedSha256}</span>
                  <button
                    type="button"
                    onClick={() => copyText("computedSha256", verdict.fileIntegrity.computedSha256)}
                    className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                    title="Copy computed hash"
                  >
                    {copiedKey === "computedSha256" ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expected Hash */}
              {verdict.fileIntegrity.expectedSha256 && (
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400 font-sans">Expected Manifest SHA-256:</div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] gap-2">
                    <span className="truncate text-neutral-200">{verdict.fileIntegrity.expectedSha256}</span>
                    <button
                      type="button"
                      onClick={() => copyText("expectedSha256", verdict.fileIntegrity.expectedSha256 || "")}
                      className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                      title="Copy expected hash"
                    >
                      {copiedKey === "expectedSha256" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Publisher Public Key */}
              <div className="space-y-1">
                <div className="text-[11px] text-neutral-400 font-sans">Publisher Ed25519 Public Key:</div>
                <div className="flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] gap-2">
                  <span className="truncate text-neutral-300">
                    {verdict.signatureVerification.publicKeyUsed || "No registered key available"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("pubKey", verdict.signatureVerification.publicKeyUsed)}
                    className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                    title="Copy publisher key"
                  >
                    {copiedKey === "pubKey" ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Monad Registry Commitment Digest */}
              {verdict.releaseRecord && (
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400 font-sans">Monad On-Chain Release Digest:</div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] gap-2">
                    <span className="truncate text-neutral-300">{verdict.releaseRecord.releaseDigest}</span>
                    <button
                      type="button"
                      onClick={() => copyText("regDigest", verdict.releaseRecord?.releaseDigest || "")}
                      className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                      title="Copy release digest"
                    >
                      {copiedKey === "regDigest" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Piece Matrix component if chunk details exist */}
          {verdict.fileIntegrity.chunkDetails && verdict.fileIntegrity.chunkDetails.length > 0 && (
            <ChunkMatrix
              chunkDetails={verdict.fileIntegrity.chunkDetails}
              chunkSize={activeManifest?.chunkSize ?? 16}
              totalChunks={verdict.fileIntegrity.chunksTotal ?? 0}
              matchedChunks={verdict.fileIntegrity.chunksMatched ?? 0}
            />
          )}

          {/* Expandable Advanced Disclosure */}
          <details className="group rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-xs font-mono font-semibold text-neutral-900 uppercase tracking-wider flex items-center justify-between list-none">
              <span>Inspect Canonical Manifest Envelope (RFC 8785 JSON)</span>
              <span className="text-neutral-400 group-open:rotate-180 transition-transform">
                <ChevronDown className="w-4 h-4" />
              </span>
            </summary>
            <div className="pt-3 border-t border-neutral-100 mt-3 space-y-2">
              <pre className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] font-mono text-neutral-800 overflow-x-auto max-h-56">
                {manifestText}
              </pre>
            </div>
          </details>

          {/* Caveats note */}
          {verdict.caveats && verdict.caveats.length > 0 && (
            <div className="p-4 rounded-lg border-l-4 border-l-neutral-950 border border-neutral-200 bg-neutral-50 space-y-1.5 text-xs">
              <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-neutral-700" />
                <span>Verification Scope &amp; Limits</span>
              </div>
              <ul className="space-y-1 text-neutral-600 list-disc list-inside">
                {verdict.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
