"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Upload,
  FileCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
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
import { fetchOnChainReleaseByFileHash } from "@/lib/chain/contract";
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
  const [verdict, setVerdict] = useState<VerificationVerdict | null>(null);
  const [activeManifest, setActiveManifest] = useState<SignedReleaseManifest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    try {
      // 1. Validate manifest JSON
      const parsed = await parseAndValidateManifest(manifestText);
      if (!parsed.valid) {
        setErrorMessage(parsed.message);
        setIsVerifying(false);
        return;
      }

      setActiveManifest(parsed.manifest);

      // Check on-chain registry if no preset record active
      let effectiveRecord = onChainRecord;
      if (!effectiveRecord) {
        try {
          const liveRecord = await fetchOnChainReleaseByFileHash(
            ("0x" + parsed.manifest.sha256) as `0x${string}`
          );
          if (liveRecord) {
            effectiveRecord = liveRecord;
          }
        } catch {
          // Graceful fallback
        }
      }

      // 2. Run verification engine
      const res = await verifyFileAgainstManifest({
        fileBytes,
        fileName,
        manifest: parsed.manifest,
        publisherPublicKeyHex: publisherPubKey.trim(),
        onChainRecord: effectiveRecord,
      });

      setVerdict(res);
    } catch (err) {
      setErrorMessage("Verification failure: " + (err as Error).message);
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Demo Preset Selector Bar */}
      <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded bg-cyan-900/60 px-2 py-0.5 text-[11px] font-medium text-cyan-300 border border-cyan-700/50">
              DEMO DATA PRESETS
            </span>
            <span className="text-xs text-gray-400">
              Select pre-built cryptographically signed fixtures to test verification states:
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {fixtures.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFixture(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFixtureId === f.id
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/50"
                  : "bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dual Inputs: Target File & Manifest */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Target File */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Target File</span>
            </h3>
            {isDemoData && (
              <span className="text-[10px] bg-amber-950/60 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded font-mono">
                DEMO FIXTURE
              </span>
            )}
          </div>

          <div className="border border-dashed border-gray-800 hover:border-gray-700 rounded-xl p-5 text-center bg-gray-950/40">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-xs text-gray-400 hover:text-gray-200"
            >
              <Upload className="w-6 h-6 text-gray-500 mb-1" />
              <span className="font-medium text-white">Click to browse local file</span>
              <span className="text-[11px] text-gray-500">
                Processed locally in-browser via Web Crypto SHA-256
              </span>
            </label>
          </div>

          {fileName && (
            <div className="p-3 rounded-lg bg-gray-950 border border-gray-800/80 text-xs font-mono space-y-1">
              <div className="text-gray-300 truncate">
                File: <span className="text-cyan-400 font-semibold">{fileName}</span>
              </div>
              <div className="text-gray-500">
                Size: {fileBytes ? `${fileBytes.byteLength} bytes` : "0 bytes"}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Signed Manifest & Public Key */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Release Manifest & Key</span>
            </h3>
            <label
              htmlFor="manifest-upload"
              className="cursor-pointer text-[11px] text-cyan-400 hover:underline"
            >
              Upload .json
              <input
                type="file"
                id="manifest-upload"
                accept=".json"
                className="hidden"
                onChange={handleManifestUpload}
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-gray-400">
              Publisher Ed25519 Public Key (Hex):
            </label>
            <input
              type="text"
              value={publisherPubKey}
              onChange={(e) => setPublisherPubKey(e.target.value)}
              className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. 8580e9bff52d9f..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-400">Signed Manifest JSON:</label>
            <textarea
              rows={4}
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              className="w-full rounded-lg bg-gray-950 border border-gray-800 p-2.5 text-[11px] font-mono text-gray-300 focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="Paste RFC 8785 compatible signed manifest JSON..."
            />
          </div>
        </div>
      </div>

      {/* Verify Action Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleRunVerification}
          disabled={isVerifying || !fileBytes}
          className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 text-white font-medium text-sm transition-all shadow-lg shadow-cyan-950 flex items-center space-x-2 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Hashing and verifying pieces...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Run Live Swarm Verification</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Verification Result Display */}
      {verdict && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Verdict Card */}
          <div
            className={`rounded-2xl border p-6 space-y-4 ${
              verdict.status === "MATCHING_AUTHENTICATED_RELEASE"
                ? "bg-emerald-950/20 border-emerald-800/60"
                : verdict.status === "REVOKED_RELEASE"
                ? "bg-rose-950/30 border-rose-800/80"
                : verdict.status === "HASH_MISMATCH"
                ? "bg-amber-950/20 border-amber-800/60"
                : "bg-gray-900/60 border-gray-800"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  Verification Verdict
                </span>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  {verdict.status === "MATCHING_AUTHENTICATED_RELEASE" && (
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  )}
                  {verdict.status === "HASH_MISMATCH" && (
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  )}
                  {verdict.status === "REVOKED_RELEASE" && (
                    <ShieldAlert className="w-6 h-6 text-rose-400" />
                  )}
                  <span>{verdict.status.replace(/_/g, " ")}</span>
                </h3>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  verdict.status === "MATCHING_AUTHENTICATED_RELEASE"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : verdict.status === "REVOKED_RELEASE"
                    ? "bg-rose-950 text-rose-300 border-rose-700"
                    : "bg-amber-950 text-amber-300 border-amber-700"
                }`}
              >
                {verdict.status}
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">{verdict.summary}</p>

            {/* Verification Proofs Grid */}
            <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-800/80">
              {/* Proof 1: File Checksum */}
              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 space-y-1">
                <div className="text-[11px] text-gray-400">File SHA-256 Checksum</div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  {verdict.fileIntegrity.status === "MATCH" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Exact Match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300">Hash Mismatch</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-500 truncate">
                  {verdict.fileIntegrity.computedSha256}
                </div>
              </div>

              {/* Proof 2: Ed25519 Publisher Signature */}
              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 space-y-1">
                <div className="text-[11px] text-gray-400">Ed25519 Publisher Signature</div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  {verdict.signatureVerification.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Cryptographically Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-300">Invalid Signature</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-500 truncate">
                  Key: {verdict.signatureVerification.publicKeyUsed}
                </div>
              </div>

              {/* Proof 3: Monad On-Chain Status */}
              <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 space-y-1">
                <div className="text-[11px] text-gray-400">Monad Testnet Release Status</div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  {verdict.releaseRecord?.status === "ACTIVE" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300">Active On-Chain</span>
                    </>
                  ) : verdict.releaseRecord?.status === "REVOKED" ? (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-300">Revoked On-Chain</span>
                    </>
                  ) : (
                    <span className="text-gray-400">
                      {verdict.releaseRecord?.status ?? "UNKNOWN"}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-500 truncate">
                  Block #{verdict.releaseRecord?.blockNumber?.toString() ?? "1042000"}
                </div>
              </div>
            </div>
          </div>

          {/* Piece-by-Piece Chunk Matrix (if chunk details available) */}
          {verdict.fileIntegrity.chunkDetails && verdict.fileIntegrity.chunkDetails.length > 0 && (
            <ChunkMatrix
              chunkDetails={verdict.fileIntegrity.chunkDetails}
              chunkSize={activeManifest?.chunkSize ?? 16}
              totalChunks={verdict.fileIntegrity.chunksTotal ?? 0}
              matchedChunks={verdict.fileIntegrity.chunksMatched ?? 0}
            />
          )}

          {/* Honest Security Caveats */}
          {verdict.caveats && verdict.caveats.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 space-y-2">
              <div className="text-xs font-semibold text-gray-300 flex items-center space-x-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Verification Scope & Cryptographic Guarantees</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-400">
                {verdict.caveats.map((caveat: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-cyan-500 shrink-0">•</span>
                    <span>{caveat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
