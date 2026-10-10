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
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { verifyFileAgainstManifest } from "@/lib/verification/engine";
import { parseAndValidateManifest } from "@/lib/manifests/manifest";
import {
  getDemoFixtures,
  DEMO_PUBLISHER,
  DEMO_MONAD_PUBLISHER,
  type DemoFixtureItem,
} from "@/lib/demo-data/fixtures";
import { ChunkMatrix } from "./ChunkMatrix";
import {
  fetchOnChainReleaseByFileHash,
  fetchPublisherById,
  getRegistryAddress,
} from "@/lib/chain/contract";
import type {
  VerificationVerdict,
  SignedReleaseManifest,
  ReleaseRecord,
} from "@/lib/verification/types";

export function FileVerifier() {
  const [fixtures, setFixtures] = useState<DemoFixtureItem[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("fixture-authentic-ubuntu");
  const [fileName, setFileName] = useState<string>("");
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [manifestText, setManifestText] = useState<string>("");
  const [publisherPubKey, setPublisherPubKey] = useState<string>(DEMO_PUBLISHER.publicKeyHex);
  const [onChainRecord, setOnChainRecord] = useState<ReleaseRecord | undefined>(undefined);
  const [isDemoData, setIsDemoData] = useState<boolean>(true);

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
    setManifestText(JSON.stringify(f.manifest, null, 2));
    setOnChainRecord(f.releaseRecord);
    setActiveManifest(f.manifest);
    setIsDemoData(true);
    setVerdict(null);
    setErrorMessage(null);

    if (f.manifest.publisherId === DEMO_MONAD_PUBLISHER.publisherId) {
      setPublisherPubKey(DEMO_MONAD_PUBLISHER.publicKeyHex);
    } else {
      setPublisherPubKey(DEMO_PUBLISHER.publicKeyHex);
    }
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Handle local user file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      setFileName(file.name);
      setFileBytes(new Uint8Array(buffer));
      setIsDemoData(false);
      setSelectedFixtureId("custom");
      setOnChainRecord(undefined);
      setVerdict(null);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage("Could not read local file: " + (err as Error).message);
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
    if (!fileBytes) {
      setErrorMessage("Please select or drop a target file.");
      return;
    }
    if (!manifestText.trim()) {
      setErrorMessage("Please provide a signed release manifest JSON.");
      return;
    }
    if (!publisherPubKey.trim()) {
      setErrorMessage("Please specify the publisher's Ed25519 public key hex.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setVerifyingStep("Parsing and validating RFC 8785 manifest...");

    try {
      // 1. Validate manifest JSON
      const parsed = await parseAndValidateManifest(manifestText);
      if (!parsed.valid) {
        setErrorMessage(parsed.message);
        setIsVerifying(false);
        return;
      }

      setActiveManifest(parsed.manifest);

      // Check on-chain registry for publisher and release
      setVerifyingStep("Checking Monad Testnet registry commitments...");
      let effectiveRecord = onChainRecord;
      let authorizedPubKeyFromChain: string | null = null;
      let networkErrorMsg: string | null = null;

      try {
        const publisherInfo = await fetchPublisherById(parsed.manifest.publisherId);
        if (publisherInfo) {
          authorizedPubKeyFromChain = publisherInfo.ed25519PubKey;
        }

        if (!effectiveRecord) {
          const liveRecord = await fetchOnChainReleaseByFileHash(
            ("0x" + parsed.manifest.sha256) as `0x${string}`
          );
          if (liveRecord) {
            effectiveRecord = liveRecord;
          }
        }
      } catch (netErr: any) {
        networkErrorMsg = netErr?.message || "Failed to query Monad Testnet RPC";
      }

      // 2. Run verification engine
      setVerifyingStep("Calculating SHA-256 and verifying pieces locally...");
      const res = await verifyFileAgainstManifest({
        fileBytes,
        fileName,
        manifest: parsed.manifest,
        publisherPublicKeyHex: publisherPubKey.trim(),
        onChainRecord: effectiveRecord,
        authorizedPublisherPubKeyHex: authorizedPubKeyFromChain,
        networkError: networkErrorMsg,
      });

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
          style: "bg-emerald-50 border-emerald-200 text-emerald-900",
          badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: <Check className="w-5 h-5 text-emerald-700 shrink-0" />,
          summary: "Calculated SHA-256 checksum matches the signed manifest. Publisher signature and Monad Testnet registry commitments verified.",
        };
      case "HASH_MISMATCH":
        return {
          title: "Hash mismatch",
          style: "bg-red-50 border-red-200 text-red-900",
          badgeStyle: "bg-red-100 text-red-800 border-red-300",
          icon: <X className="w-5 h-5 text-red-700 shrink-0" />,
          summary: "The computed file hash differs from the signed manifest digest. The file content has changed or become corrupted.",
        };
      case "INVALID_MANIFEST_SIGNATURE":
        return {
          title: "Signature invalid",
          style: "bg-red-50 border-red-200 text-red-900",
          badgeStyle: "bg-red-100 text-red-800 border-red-300",
          icon: <X className="w-5 h-5 text-red-700 shrink-0" />,
          summary: "The Ed25519 signature does not match the manifest contents or publisher key. The manifest cannot be trusted.",
        };
      case "UNAUTHORIZED_KEY":
        return {
          title: "Publisher not authorized",
          style: "bg-amber-50 border-amber-200 text-amber-900",
          badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
          icon: <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />,
          summary: "The key used to sign this manifest is not registered as authorized for this publisher on Monad Testnet.",
        };
      case "UNKNOWN_RELEASE":
        return {
          title: "Release not found",
          style: "bg-neutral-100 border-neutral-200 text-neutral-800",
          badgeStyle: "bg-neutral-200 text-neutral-800 border-neutral-300",
          icon: <Info className="w-5 h-5 text-neutral-600 shrink-0" />,
          summary: "No on-chain commitment was found on Monad Testnet for this release digest. The file may be uncommitted or self-hosted.",
        };
      case "NETWORK_ERROR":
        return {
          title: "Registry unavailable",
          style: "bg-neutral-100 border-neutral-200 text-neutral-800",
          badgeStyle: "bg-neutral-200 text-neutral-800 border-neutral-300",
          icon: <Info className="w-5 h-5 text-neutral-600 shrink-0" />,
          summary: "Unable to reach the Monad Testnet RPC endpoint. Local file integrity and signature were verified, but on-chain status is unknown.",
        };
      case "REVOKED_RELEASE":
        return {
          title: "Release revoked",
          style: "bg-red-50 border-red-200 text-red-900",
          badgeStyle: "bg-red-100 text-red-800 border-red-300",
          icon: <X className="w-5 h-5 text-red-700 shrink-0" />,
          summary: "This release was marked as REVOKED on Monad Testnet by the publisher. Do not run or deploy this artifact.",
        };
      case "SUPERSEDED_RELEASE":
        return {
          title: "Release superseded",
          style: "bg-neutral-100 border-neutral-200 text-neutral-800",
          badgeStyle: "bg-neutral-200 text-neutral-800 border-neutral-300",
          icon: <Info className="w-5 h-5 text-neutral-600 shrink-0" />,
          summary: "This release is authentic but has been superseded by a newer version on Monad Testnet.",
        };
      default:
        return {
          title: "Incomplete verification",
          style: "bg-amber-50 border-amber-200 text-amber-900",
          badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
          icon: <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />,
          summary: v.summary || "One or more verification steps could not be completed.",
        };
    }
  }

  return (
    <div className="space-y-6">
      {/* Sample Fixtures Bar */}
      <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-neutral-900">Sample fixtures:</span>
          <span className="text-neutral-500">Test verification states using signed demo data:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fixtures.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFixture(f)}
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

      {/* Primary Verification Card */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Target File Picker */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              1. Target file
            </h3>
            {isDemoData && (
              <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                Demo fixture
              </span>
            )}
          </div>

          <div className="border border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg p-6 text-center bg-neutral-50/50 transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-xs text-neutral-600 hover:text-neutral-900"
            >
              <Upload className="w-6 h-6 text-neutral-400 mb-1" />
              <span className="font-medium text-neutral-900 text-sm">Drop file here or click to browse</span>
              <span className="text-[11px] text-neutral-500 max-w-xs">
                Processed locally in your browser via Web Crypto SHA-256 — your file is never uploaded.
              </span>
            </label>
          </div>

          {fileName && (
            <div className="p-3 rounded bg-neutral-50 border border-neutral-200 text-xs font-mono space-y-1">
              <div className="text-neutral-900 truncate">
                File: <span className="font-semibold">{fileName}</span>
              </div>
              <div className="text-neutral-500">
                Size: {fileBytes ? `${fileBytes.byteLength.toLocaleString()} bytes` : "0 bytes"}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Release Manifest & Key */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              2. Manifest & publisher key
            </h3>
            <label
              htmlFor="manifest-upload"
              className="cursor-pointer text-xs text-neutral-900 hover:underline flex items-center space-x-1"
            >
              <FileCode className="w-3.5 h-3.5" />
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

          <div className="space-y-1.5">
            <label className="text-xs text-neutral-600">
              Publisher Ed25519 public key (hex):
            </label>
            <input
              type="text"
              value={publisherPubKey}
              onChange={(e) => setPublisherPubKey(e.target.value)}
              className="w-full rounded bg-white border border-neutral-200 px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
              placeholder="e.g. 8580e9bff52d9f..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-neutral-600">Signed manifest JSON:</label>
            <textarea
              rows={4}
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              className="w-full rounded bg-white border border-neutral-200 p-2.5 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-900 resize-none"
              placeholder="Paste RFC 8785 signed manifest JSON..."
            />
          </div>
        </div>
      </div>

      {/* Verify Action Button */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <button
          type="button"
          onClick={handleRunVerification}
          disabled={isVerifying || !fileBytes}
          className="px-6 py-2.5 rounded-md bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 font-medium text-sm transition-colors flex items-center space-x-2"
        >
          <span>{isVerifying ? "Verifying file..." : "Verify file"}</span>
        </button>

        {isVerifying && (
          <div className="text-xs text-neutral-500 animate-pulse">
            {verifyingStep || "Processing..."}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-center space-x-2">
          <X className="w-4 h-4 text-red-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Verification Result Display */}
      {verdict && (
        <div className="space-y-6">
          {(() => {
            const banner = getBannerConfig(verdict);
            return (
              <div className={`p-5 rounded-lg border ${banner.style} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {banner.icon}
                    <h3 className="text-base font-bold tracking-tight">{banner.title}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border ${banner.badgeStyle}`}>
                    {verdict.status}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">{banner.summary}</p>
              </div>
            );
          })()}

          {/* 3 Clean Structured Check Rows */}
          <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
            {/* Check 1: File integrity */}
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-neutral-900">1. File integrity</div>
                <p className="text-xs text-neutral-500">
                  Computed SHA-256 vs. reference manifest digest
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {verdict.fileIntegrity.status === "MATCH" ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Exact match</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                    <X className="w-3.5 h-3.5" />
                    <span>Mismatch</span>
                  </span>
                )}
              </div>
            </div>

            {/* Check 2: Publisher authenticity */}
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-neutral-900">2. Publisher authenticity</div>
                <p className="text-xs text-neutral-500">
                  Ed25519 signature over canonical RFC 8785 manifest payload
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {verdict.signatureVerification.isValid ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Signature valid</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                    <X className="w-3.5 h-3.5" />
                    <span>Invalid signature</span>
                  </span>
                )}
              </div>
            </div>

            {/* Check 3: Registry status */}
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-neutral-900">3. Registry status</div>
                <p className="text-xs text-neutral-500">
                  On-chain record registered on Monad Testnet
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {verdict.releaseRecord?.status === "ACTIVE" ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active on-chain</span>
                  </span>
                ) : verdict.releaseRecord?.status === "REVOKED" ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                    <X className="w-3.5 h-3.5" />
                    <span>Revoked on-chain</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200">
                    <span>{verdict.releaseRecord?.status ?? "Unregistered"}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Technical Details Disclosure */}
          <details className="group rounded-lg border border-neutral-200 bg-white p-4 space-y-4">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center justify-between list-none">
              <span>Technical details & cryptographic evidence</span>
              <span className="text-neutral-400 group-open:rotate-180 transition-transform">
                <ChevronDown className="w-4 h-4" />
              </span>
            </summary>

            <div className="pt-4 border-t border-neutral-100 space-y-4 text-xs">
              {/* Hashes breakdown */}
              <div className="space-y-2">
                <div className="text-neutral-500 font-medium">Computed file SHA-256:</div>
                <div className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] text-neutral-900 gap-2">
                  <span className="truncate">{verdict.fileIntegrity.computedSha256}</span>
                  <button
                    type="button"
                    onClick={() => copyText("computedSha256", verdict.fileIntegrity.computedSha256)}
                    className="text-neutral-400 hover:text-neutral-900 shrink-0 p-1"
                    title="Copy hash"
                  >
                    {copiedKey === "computedSha256" ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {verdict.fileIntegrity.expectedSha256 && (
                <div className="space-y-2">
                  <div className="text-neutral-500 font-medium">Expected manifest SHA-256:</div>
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] text-neutral-900 gap-2">
                    <span className="truncate">{verdict.fileIntegrity.expectedSha256}</span>
                    <button
                      type="button"
                      onClick={() => copyText("expectedSha256", verdict.fileIntegrity.expectedSha256 || "")}
                      className="text-neutral-400 hover:text-neutral-900 shrink-0 p-1"
                      title="Copy hash"
                    >
                      {copiedKey === "expectedSha256" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-neutral-500 font-medium">Publisher public key:</div>
                <div className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 font-mono text-[11px] text-neutral-900 gap-2">
                  <span className="truncate">{verdict.signatureVerification.publicKeyUsed}</span>
                  <button
                    type="button"
                    onClick={() => copyText("pubKey", verdict.signatureVerification.publicKeyUsed)}
                    className="text-neutral-400 hover:text-neutral-900 shrink-0 p-1"
                    title="Copy key"
                  >
                    {copiedKey === "pubKey" ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Piece Matrix if available */}
              {verdict.fileIntegrity.chunkDetails && verdict.fileIntegrity.chunkDetails.length > 0 && (
                <div className="pt-2">
                  <ChunkMatrix
                    chunkDetails={verdict.fileIntegrity.chunkDetails}
                    chunkSize={activeManifest?.chunkSize ?? 16}
                    totalChunks={verdict.fileIntegrity.chunksTotal ?? 0}
                    matchedChunks={verdict.fileIntegrity.chunksMatched ?? 0}
                  />
                </div>
              )}
            </div>
          </details>

          {/* Caveats note */}
          {verdict.caveats && verdict.caveats.length > 0 && (
            <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 space-y-2 text-xs">
              <div className="font-semibold text-neutral-900 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-neutral-500" />
                <span>Verification scope and limits</span>
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
