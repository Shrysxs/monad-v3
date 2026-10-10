'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Copy,
  Check,
  FileCode,
  Info,
  ExternalLink,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { VerificationResult, VerifiedRelease } from '@/types/swarm';
import { calculateFileSha256, verifyAgainstRegistry, formatBytes, truncateHash } from '@/lib/crypto';
import { MOCK_REGISTRY_RELEASES } from '@/data/mockRegistry';
import { useNavigate } from 'react-router-dom';

interface LiveIntegrityViewProps {
  onInspectReleaseInDna?: (release: VerifiedRelease) => void;
}

export function LiveIntegrityView({ onInspectReleaseInDna }: LiveIntegrityViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressPhase, setProgressPhase] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressPhase('Initializing Web Crypto context...');
    setResult(null);
    setCurrentFile(file);

    try {
      const { hash, durationMs } = await calculateFileSha256(file, (percent, phase) => {
        setProgressPercent(percent);
        setProgressPhase(phase);
      });

      const verification = verifyAgainstRegistry(file, hash, durationMs);
      setResult(verification);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cryptographic computation failure';
      setResult({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'unknown',
        lastModified: file.lastModified,
        computedSha256: '0000000000000000000000000000000000000000000000000000000000000000',
        durationMs: 0,
        status: 'error',
        authenticity: 'UNKNOWN',
        scannerStatus: 'SCANNER_UNAVAILABLE',
        scannerNotice: 'Verification aborted due to read/buffer failure.',
        errorMessage: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setResult(null);
    setCurrentFile(null);
    setProgressPercent(0);
    setProgressPhase('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Helper to test each specific verification status on demand
  const triggerSampleTest = (type: 'matching' | 'mismatch' | 'unknown' | 'revoked' | 'error' | 'invalid_sig') => {
    let mockBlob: Blob;
    let fileName: string;

    if (type === 'matching') {
      fileName = 'monad-node-v0.8.2-linux-x86_64.tar.gz';
      mockBlob = new Blob(['Monad-Consensus-Node-v0.8.2-Deterministic-Release-Payload'], {
        type: 'application/gzip',
      });
    } else if (type === 'mismatch') {
      fileName = 'monad-node-v0.8.2-linux-x86_64.tar.gz';
      mockBlob = new Blob(['Tampered binary payload containing injected non-attested code'], {
        type: 'application/gzip',
      });
    } else if (type === 'revoked') {
      fileName = 'monad-node-v0.8.2-rc1-linux-x86_64.tar.gz';
      mockBlob = new Blob(['Monad-Node-RC1-Memory-Vulnerability-Exploitable-Candidate'], {
        type: 'application/gzip',
      });
    } else if (type === 'invalid_sig') {
      fileName = 'monad-node-v0.8.2-unsigned.tar.gz';
      mockBlob = new Blob(['Unsigned build candidate with compromised ed25519 signature'], {
        type: 'application/gzip',
      });
    } else if (type === 'error') {
      fileName = 'corrupt-zero-byte.bin';
      mockBlob = new Blob([], { type: 'application/octet-stream' });
    } else {
      fileName = 'unregistered-custom-script.sh';
      mockBlob = new Blob(['#!/bin/bash\necho "Custom unverified script"'], {
        type: 'text/x-shellscript',
      });
    }

    const testFile = new File([mockBlob], fileName, {
      type: mockBlob.type,
      lastModified: Date.now(),
    });

    setCurrentFile(testFile);

    // Simulate real timing for demo test triggers
    if (type === 'matching' || type === 'revoked') {
      setIsProcessing(true);
      setProgressPercent(15);
      setProgressPhase('Reading file into memory buffer...');
      setTimeout(() => {
        setProgressPercent(65);
        setProgressPhase('Executing Web Crypto SHA-256 digest...');
        setTimeout(() => {
          setProgressPercent(100);
          setProgressPhase('Digest calculation complete');
          setIsProcessing(false);

          const targetRel =
            type === 'matching'
              ? MOCK_REGISTRY_RELEASES[0] // v0.8.2
              : MOCK_REGISTRY_RELEASES[2]; // v0.8.2-rc1 revoked

          const res = verifyAgainstRegistry(testFile, targetRel.sha256, 142);
          setResult(res);
        }, 200);
      }, 250);
      return;
    }

    processFile(testFile);
  };

  const handleInspectRelease = (rel: VerifiedRelease) => {
    if (onInspectReleaseInDna) {
      onInspectReleaseInDna(rel);
    }
    navigate('/app/releases');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Local Sandbox & Strict Authenticity Policy */}
      <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-[4px] bg-[#5E6BFF]/10 border border-[#5E6BFF]/30 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-[#5E6BFF]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#F0F1F2] flex items-center gap-2">
              Browser-Side Web Crypto Execution
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#152E22] text-[#31C875] border border-[#31C875]/30">
                100% PRIVATE
              </span>
            </div>
            <p className="text-[11px] text-[#9A9DA3] mt-0.5 max-w-2xl">
              File bytes are never uploaded. Cryptographic SHA-256 hashes are calculated locally via{' '}
              <code className="text-[#F0F1F2] font-mono">crypto.subtle.digest</code> and validated against
              the Monad release registry ledger.
            </p>
          </div>
        </div>

        {/* Demo Test State Triggers */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center">
          <span className="text-[10px] font-mono text-[#9A9DA3] mr-1">Status Demos:</span>
          <button
            onClick={() => triggerSampleTest('matching')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#31C875]/40 text-[#31C875] rounded-[4px] transition-colors cursor-pointer"
            title="Test Matching Authenticated Release"
          >
            Match
          </button>
          <button
            onClick={() => triggerSampleTest('mismatch')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#E45B5B]/40 text-[#E45B5B] rounded-[4px] transition-colors cursor-pointer"
            title="Test Hash Mismatch / Tampered Binary"
          >
            Mismatch
          </button>
          <button
            onClick={() => triggerSampleTest('revoked')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#F97316]/40 text-[#F97316] rounded-[4px] transition-colors cursor-pointer"
            title="Test Revoked Release"
          >
            Revoked
          </button>
          <button
            onClick={() => triggerSampleTest('unknown')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#E4CD19]/40 text-[#E4CD19] rounded-[4px] transition-colors cursor-pointer"
            title="Test Unknown Unregistered Artifact"
          >
            Unknown
          </button>
          <button
            onClick={() => triggerSampleTest('error')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#9A9DA3]/40 text-[#9A9DA3] rounded-[4px] transition-colors cursor-pointer"
            title="Test Verification Error on Corrupt/0-byte File"
          >
            Error
          </button>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-8 rounded-[8px] border-2 border-dashed transition-all cursor-pointer text-center ${
          dragActive
            ? 'border-[#5E6BFF] bg-[#5E6BFF]/5'
            : 'border-[#1B1C1E] hover:border-[#232426] bg-[#101112]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-[6px] bg-[#151617] border border-[#1B1C1E] flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6 text-[#5E6BFF]" />
          </div>

          <h3 className="text-sm font-semibold text-[#F0F1F2]">
            {currentFile ? 'Replace selected binary, or ' : 'Drop artifact binary here, or '}
            <span className="text-[#5E6BFF] underline underline-offset-2">browse filesystem</span>
          </h3>
          <p className="text-xs text-[#9A9DA3] mt-1.5 leading-relaxed">
            Accepts any file type (.tar.gz, .zip, .so, .bin, .wasm, .json). Computes cryptographic
            digest instantly in memory.
          </p>

          <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-[#9A9DA3]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E6BFF]" />
              Web Crypto API
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#31C875]" />
              Client-Only Sandbox
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9A9DA3]" />
              Zero Network Egress
            </span>
          </div>
        </div>
      </div>

      {/* Selected File Action Bar (Replacement / Removal) */}
      {currentFile && (
        <div className="p-3 bg-[#151617] border border-[#1B1C1E] rounded-[6px] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 font-mono text-[#F0F1F2]">
            <FileCode className="w-4 h-4 text-[#5E6BFF]" />
            <span>{currentFile.name}</span>
            <span className="text-[#9A9DA3]">({formatBytes(currentFile.size)})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-[#101112] hover:bg-[#191A1C] border border-[#1B1C1E] rounded text-[11px] font-mono text-[#F0F1F2] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-[#5E6BFF]" />
              <span>Replace File</span>
            </button>
            <button
              onClick={handleClearFile}
              className="px-2.5 py-1 bg-[#2E1517] hover:bg-[#3D1A1D] border border-[#E45B5B]/30 rounded text-[11px] font-mono text-[#E45B5B] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}

      {/* Real-time Calculation Progress Bar */}
      {isProcessing && (
        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[#F0F1F2] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5E6BFF] animate-ping" />
              {progressPhase}
            </span>
            <span className="font-mono text-[#5E6BFF] font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#151617] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5E6BFF] transition-all duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div className="space-y-4">
          {/* Status Header Banner */}
          <div
            className={`p-5 rounded-[8px] border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              result.status === 'matching'
                ? 'bg-[#101914] border-[#31C875]/30'
                : result.status === 'mismatch'
                ? 'bg-[#251214] border-[#E45B5B]/40'
                : result.status === 'revoked'
                ? 'bg-[#29170F] border-[#F97316]/40'
                : result.status === 'unknown'
                ? 'bg-[#211E10] border-[#E4CD19]/40'
                : 'bg-[#1F171A] border-[#9A9DA3]/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.status === 'matching' && (
                <ShieldCheck className="w-6 h-6 text-[#31C875] shrink-0 mt-0.5" />
              )}
              {result.status === 'mismatch' && (
                <ShieldX className="w-6 h-6 text-[#E45B5B] shrink-0 mt-0.5" />
              )}
              {result.status === 'revoked' && (
                <ShieldAlert className="w-6 h-6 text-[#F97316] shrink-0 mt-0.5" />
              )}
              {result.status === 'unknown' && (
                <AlertTriangle className="w-6 h-6 text-[#E4CD19] shrink-0 mt-0.5" />
              )}
              {result.status === 'error' && (
                <AlertTriangle className="w-6 h-6 text-[#9A9DA3] shrink-0 mt-0.5" />
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#F0F1F2]">
                    {result.status === 'matching' && 'MATCHING_AUTHENTICATED_RELEASE'}
                    {result.status === 'mismatch' && 'HASH_MISMATCH: POTENTIAL TAMPERING'}
                    {result.status === 'revoked' && 'REVOKED_RELEASE: CERTIFICATE WITHDRAWN'}
                    {result.status === 'unknown' && 'UNKNOWN_RELEASE: UNREGISTERED IN MONAD LEDGER'}
                    {result.status === 'error' && 'VERIFICATION_ERROR'}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] uppercase bg-black/40 border border-current text-inherit">
                    {result.authenticity}
                  </span>
                </div>
                <p className="text-xs text-[#9A9DA3] mt-1">
                  {result.status === 'matching' &&
                    'The calculated SHA-256 matches an on-chain attested release published by a verified Monad keyholder.'}
                  {result.status === 'mismatch' &&
                    'Filename matches an official release, but binary checksum fails on-chain validation. Do not execute.'}
                  {result.status === 'revoked' &&
                    'This artifact was formally revoked by the publisher due to known vulnerabilities or compromised keys.'}
                  {result.status === 'unknown' &&
                    'No published provenance records exist for this cryptographic hash on the Monad ledger.'}
                  {result.status === 'error' && result.errorMessage}
                </p>
              </div>
            </div>

            {/* Inspect in DNA action */}
            {result.matchedRelease && (
              <button
                onClick={() => handleInspectRelease(result.matchedRelease!)}
                className="px-3 py-2 bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] text-xs font-medium text-[#F0F1F2] rounded-[4px] flex items-center gap-1.5 self-start md:self-center transition-colors shrink-0 cursor-pointer"
              >
                <span>View in Release DNA</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#5E6BFF]" />
              </button>
            )}
          </div>

          {/* CRITICAL CALLOUT: Authenticity vs Malware Separation */}
          <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#5E6BFF]" />
                <span className="text-xs font-semibold text-[#F0F1F2]">
                  Security Protocol: Authenticity vs. Malware Analysis
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
                STATUS: {result.scannerStatus}
              </span>
            </div>
            <p className="text-[11px] text-[#9A9DA3] leading-relaxed">
              <strong className="text-[#F0F1F2]">Authenticity</strong> proves that this specific binary was produced and signed by the verified publisher.
              It does <span className="underline text-[#E45B5B]">NOT</span> guarantee absence of zero-days or supply chain flaws.{' '}
              <span className="text-[#F0F1F2]">
                {result.scannerNotice}
              </span>
            </p>
          </div>

          {/* Detailed Verification Telemetry Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* File & Hash Panel */}
            <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-3">
              <div className="text-xs font-semibold text-[#F0F1F2] flex items-center justify-between border-b border-[#1B1C1E] pb-2">
                <span className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-[#5E6BFF]" />
                  Local File Attributes
                </span>
                <span className="text-[10px] font-mono text-[#9A9DA3]">
                  Calculated in {result.durationMs}ms
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#9A9DA3]">File Name:</span>
                  <span className="font-mono text-[#F0F1F2] font-medium">{result.fileName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9A9DA3]">File Size:</span>
                  <span className="font-mono text-[#F0F1F2]">
                    {formatBytes(result.fileSize)} ({result.fileSize.toLocaleString()} bytes)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9A9DA3]">MIME Type:</span>
                  <span className="font-mono text-[#F0F1F2]">{result.mimeType}</span>
                </div>

                <div className="pt-2 border-t border-[#1B1C1E]">
                  <div className="text-[#9A9DA3] mb-1.5 flex items-center justify-between">
                    <span>Computed SHA-256 Digest:</span>
                    <button
                      onClick={() => handleCopy(result.computedSha256)}
                      className="text-[10px] font-mono text-[#5E6BFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-[#31C875]" /> : <Copy className="w-3 h-3" />}
                      {copiedHash ? 'Copied' : 'Copy Full Hex'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-[#080809] border border-[#1B1C1E] rounded-[4px] font-mono text-[11px] text-[#5E6BFF] break-all select-all">
                    {result.computedSha256}
                  </div>
                </div>
              </div>
            </div>

            {/* Registry Metadata Panel */}
            <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-3">
              <div className="text-xs font-semibold text-[#F0F1F2] flex items-center justify-between border-b border-[#1B1C1E] pb-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5E6BFF]" />
                  Monad Provenance Ledger
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#191A1C] text-[#9A9DA3] border border-[#232426] rounded-[3px]">
                  DEMO RECORD
                </span>
              </div>

              {result.matchedRelease ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Release Name:</span>
                    <span className="font-semibold text-[#F0F1F2]">{result.matchedRelease.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Version Tag:</span>
                    <span className="font-mono text-[#5E6BFF]">{result.matchedRelease.tag}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Publisher:</span>
                    <span className="font-mono text-[#F0F1F2] text-[11px]">
                      {result.matchedRelease.publisher.name} ({truncateHash(result.matchedRelease.publisher.address, 6, 4)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">On-Chain Anchor:</span>
                    <span className="font-mono text-[#F0F1F2] text-[11px]">
                      Block #{result.matchedRelease.monadBlockNumber.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Reproducible Build:</span>
                    <span className="font-mono text-[#31C875] text-[11px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Attested L3
                    </span>
                  </div>
                  {result.matchedRelease.revoked?.isRevoked && (
                    <div className="p-2 bg-[#2E1517] border border-[#E45B5B]/30 rounded-[4px] text-[11px] text-[#E45B5B] mt-2">
                      <strong>Revocation Reason:</strong> {result.matchedRelease.revoked.reason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#9A9DA3] space-y-1">
                  <AlertTriangle className="w-5 h-5 text-[#E4CD19] mx-auto mb-1" />
                  <p className="font-medium text-[#F0F1F2]">No On-Chain Provenance Record</p>
                  <p className="text-[11px]">
                    This binary is not anchored on the Monad Provenance Registry.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Discrepancies if any */}
          {result.detectedDiscrepancies && result.detectedDiscrepancies.length > 0 && (
            <div className="p-4 bg-[#151617] border border-[#E45B5B]/30 rounded-[8px] space-y-2">
              <div className="text-xs font-semibold text-[#E45B5B] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Ledger Discrepancies Detected
              </div>
              <ul className="text-xs font-mono space-y-1 text-[#F0F1F2]">
                {result.detectedDiscrepancies.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#E45B5B]">•</span>
                    <span>{d}</span>
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

export default LiveIntegrityView;
