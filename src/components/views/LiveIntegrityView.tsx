'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Copy,
  Check,
  FileCode,
  Terminal,
  Activity,
  Info,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { VerificationResult, VerificationStatus, VerifiedRelease } from '@/types/swarm';
import { calculateFileSha256, verifyAgainstRegistry, formatBytes, truncateHash, formatTimestamp } from '@/lib/crypto';
import { MOCK_REGISTRY_RELEASES } from '@/data/mockRegistry';

interface LiveIntegrityViewProps {
  onInspectReleaseInDna?: (release: VerifiedRelease) => void;
}

export function LiveIntegrityView({ onInspectReleaseInDna }: LiveIntegrityViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressPhase, setProgressPhase] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressPhase('Initializing Web Crypto context...');
    setResult(null);

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Test helpers to load simulated sample files for testing various verification states
  const triggerSampleTest = (type: 'matching' | 'mismatch' | 'unknown' | 'revoked' | 'error') => {
    let mockBlob: Blob;
    let fileName: string;

    if (type === 'matching') {
      // Content produces known hash or simulated exact target
      // We create a sample with exact content or inject target
      fileName = 'monad-node-v0.8.2-linux-x86_64.tar.gz';
      // To simulate matching directly, create a text blob and process with custom target:
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

    // For matching / revoked demo test, we compute the real hash or inject mock for deterministic matching demo:
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
        }, 300);
      }, 350);
      return;
    }

    processFile(testFile);
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
            <div className="text-xs font-semibold text-[#E5E2E3] flex items-center gap-2">
              Browser-Side Web Crypto Execution
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#152E22] text-[#22C55E] border border-[#22C55E]/30">
                100% PRIVATE
              </span>
            </div>
            <p className="text-[11px] text-[#9A9DA3] mt-0.5 max-w-2xl">
              File bytes are never uploaded. Cryptographic SHA-256 hashes are calculated locally via{' '}
              <code className="text-[#E5E2E3] font-mono">crypto.subtle.digest</code> and validated against
              the Monad release registry ledger.
            </p>
          </div>
        </div>

        {/* Demo Test Triggers */}
        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
          <span className="text-[10px] font-mono text-[#9A9DA3] mr-1">Demo States:</span>
          <button
            onClick={() => triggerSampleTest('matching')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#22C55E]/40 text-[#22C55E] rounded-[4px] transition-colors"
          >
            Match
          </button>
          <button
            onClick={() => triggerSampleTest('mismatch')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#EF4444]/40 text-[#EF4444] rounded-[4px] transition-colors"
          >
            Mismatch
          </button>
          <button
            onClick={() => triggerSampleTest('revoked')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#F97316]/40 text-[#F97316] rounded-[4px] transition-colors"
          >
            Revoked
          </button>
          <button
            onClick={() => triggerSampleTest('unknown')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#EAB308]/40 text-[#EAB308] rounded-[4px] transition-colors"
          >
            Unknown
          </button>
          <button
            onClick={() => triggerSampleTest('error')}
            className="px-2 py-1 text-[11px] font-mono bg-[#151617] hover:bg-[#191A1C] border border-[#1B1C1E] hover:border-[#9A9DA3]/40 text-[#9A9DA3] rounded-[4px] transition-colors"
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

          <h3 className="text-sm font-semibold text-[#E5E2E3]">
            Drop artifact binary here, or{' '}
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Client-Only Sandbox
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9A9DA3]" />
              Zero Network Egress
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Calculation Progress Bar */}
      {isProcessing && (
        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[#E5E2E3] flex items-center gap-2">
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
                ? 'bg-[#101914] border-[#22C55E]/30'
                : result.status === 'mismatch'
                ? 'bg-[#251214] border-[#EF4444]/40'
                : result.status === 'revoked'
                ? 'bg-[#29170F] border-[#F97316]/40'
                : result.status === 'unknown'
                ? 'bg-[#211E10] border-[#EAB308]/40'
                : 'bg-[#1F171A] border-[#9A9DA3]/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.status === 'matching' && (
                <ShieldCheck className="w-6 h-6 text-[#22C55E] shrink-0 mt-0.5" />
              )}
              {result.status === 'mismatch' && (
                <ShieldX className="w-6 h-6 text-[#EF4444] shrink-0 mt-0.5" />
              )}
              {result.status === 'revoked' && (
                <ShieldAlert className="w-6 h-6 text-[#F97316] shrink-0 mt-0.5" />
              )}
              {result.status === 'unknown' && (
                <AlertTriangle className="w-6 h-6 text-[#EAB308] shrink-0 mt-0.5" />
              )}
              {result.status === 'error' && (
                <AlertTriangle className="w-6 h-6 text-[#9A9DA3] shrink-0 mt-0.5" />
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#E5E2E3]">
                    {result.status === 'matching' && 'MATCHING: VERIFIED PUBLISHER ARTIFACT'}
                    {result.status === 'mismatch' && 'INTEGRITY MISMATCH: POTENTIAL TAMPERING'}
                    {result.status === 'revoked' && 'REVOKED ARTIFACT: SIGNING CERTIFICATE WITHDRAWN'}
                    {result.status === 'unknown' && 'UNKNOWN: UNREGISTERED IN MONAD LEDGER'}
                    {result.status === 'error' && 'VERIFICATION ERROR'}
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
            {result.matchedRelease && onInspectReleaseInDna && (
              <button
                onClick={() => onInspectReleaseInDna(result.matchedRelease!)}
                className="px-3 py-2 bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] text-xs font-medium text-[#E5E2E3] rounded-[4px] flex items-center gap-1.5 self-start md:self-center transition-colors shrink-0"
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
                <span className="text-xs font-semibold text-[#E5E2E3]">
                  Security Protocol: Authenticity vs. Malware Analysis
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
                STATUS: {result.scannerStatus}
              </span>
            </div>
            <p className="text-[11px] text-[#9A9DA3] leading-relaxed">
              <strong className="text-[#E5E2E3]">Authenticity</strong> proves that this specific binary was produced and signed by the verified publisher.
              It does <span className="underline text-[#EF4444]">NOT</span> guarantee absence of zero-days or supply chain flaws.{' '}
              <span className="text-[#E5E2E3]">
                {result.scannerNotice}
              </span>
            </p>
          </div>

          {/* Detailed Verification Telemetry Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* File & Hash Panel */}
            <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-3">
              <div className="text-xs font-semibold text-[#E5E2E3] flex items-center justify-between border-b border-[#1B1C1E] pb-2">
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
                  <span className="font-mono text-[#E5E2E3] font-medium">{result.fileName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9A9DA3]">File Size:</span>
                  <span className="font-mono text-[#E5E2E3]">
                    {formatBytes(result.fileSize)} ({result.fileSize.toLocaleString()} bytes)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9A9DA3]">MIME Type:</span>
                  <span className="font-mono text-[#E5E2E3]">{result.mimeType}</span>
                </div>

                <div className="pt-2 border-t border-[#1B1C1E]">
                  <div className="text-[#9A9DA3] mb-1.5 flex items-center justify-between">
                    <span>Computed SHA-256 Digest:</span>
                    <button
                      onClick={() => handleCopy(result.computedSha256)}
                      className="text-[10px] font-mono text-[#5E6BFF] hover:underline flex items-center gap-1"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
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
              <div className="text-xs font-semibold text-[#E5E2E3] flex items-center justify-between border-b border-[#1B1C1E] pb-2">
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#5E6BFF]" />
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
                    <span className="font-semibold text-[#E5E2E3]">{result.matchedRelease.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Version Tag:</span>
                    <span className="font-mono text-[#5E6BFF]">{result.matchedRelease.tag}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Publisher:</span>
                    <span className="font-mono text-[#E5E2E3] text-[11px]">
                      {result.matchedRelease.publisher.name} ({truncateHash(result.matchedRelease.publisher.address, 6, 4)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">On-Chain Anchor:</span>
                    <span className="font-mono text-[#E5E2E3] text-[11px]">
                      Block #{result.matchedRelease.monadBlockNumber.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9A9DA3]">Reproducible Build:</span>
                    <span className="font-mono text-[#22C55E] text-[11px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Attested
                    </span>
                  </div>
                  {result.matchedRelease.revoked?.isRevoked && (
                    <div className="p-2 bg-[#2E1517] border border-[#EF4444]/30 rounded-[4px] text-[11px] text-[#EF4444] mt-2">
                      <strong>Revocation Reason:</strong> {result.matchedRelease.revoked.reason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#9A9DA3] space-y-1">
                  <AlertTriangle className="w-5 h-5 text-[#EAB308] mx-auto mb-1" />
                  <p className="font-medium text-[#E5E2E3]">No On-Chain Provenance Record</p>
                  <p className="text-[11px]">
                    This binary is not anchored on the Monad Provenance Registry.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Discrepancies if any */}
          {result.detectedDiscrepancies && result.detectedDiscrepancies.length > 0 && (
            <div className="p-4 bg-[#151617] border border-[#EF4444]/30 rounded-[8px] space-y-2">
              <div className="text-xs font-semibold text-[#EF4444] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Ledger Discrepancies Detected
              </div>
              <ul className="text-xs font-mono space-y-1 text-[#E5E2E3]">
                {result.detectedDiscrepancies.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#EF4444]">•</span>
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
