"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Activity,
  ArrowRight,
  ExternalLink,
  Copy,
  CheckCheck,
  Check,
  Layers,
  FileCode,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const registryAddress = "0xeB3Ef45368cf0A28679FC6F037295fC2607deF01";
  const [copied, setCopied] = useState(false);

  function copyRegistryAddress() {
    navigator.clipboard.writeText(registryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-16 py-4 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-neutral-700 bg-neutral-100 border border-neutral-200">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
            <span>Cryptographic Software Provenance</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-950 leading-[1.1]">
            Know whether a software release is authentic.
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl font-normal">
            Verify downloaded binaries against publisher-signed RFC 8785 manifests, piece-by-piece chunk hashes, and immutable release commitments on Monad.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/verify"
              className="px-6 py-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white font-medium text-sm transition-all inline-flex items-center space-x-2 shadow-sm active:scale-[0.99]"
            >
              <span>Verify a file</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/demo"
              className="px-5 py-3 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-950 font-medium text-sm transition-all"
            >
              Try interactive demo
            </Link>
          </div>
        </div>

        {/* Restrained Technical Visual Diagram */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold text-neutral-900 uppercase tracking-wider">
                Verification Architecture
              </span>
              <span className="text-neutral-400">·</span>
              <span className="text-[11px] text-neutral-500 font-mono">100% Client-Side Hashing</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium inline-flex items-center space-x-1">
              <Check className="w-3 h-3" />
              <span>Zero File Upload</span>
            </span>
          </div>

          {/* Pipeline Diagram Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Step 1: Local File */}
            <div className="p-3.5 rounded-lg bg-white border border-neutral-200 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-neutral-500 font-semibold flex items-center justify-between">
                <span>1. Target File</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              </div>
              <div className="font-semibold text-neutral-900 truncate">binary-v2.0.iso</div>
              <div className="font-mono text-[10px] text-neutral-500 truncate">
                SHA: 4b227777...bf8a
              </div>
              <div className="text-[10px] text-neutral-600 pt-1 border-t border-neutral-100">
                Hashed in Web Crypto
              </div>
            </div>

            {/* Step 2: Manifest */}
            <div className="p-3.5 rounded-lg bg-white border border-neutral-200 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-neutral-500 font-semibold flex items-center justify-between">
                <span>2. Signed Manifest</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              </div>
              <div className="font-semibold text-neutral-900 truncate">RFC 8785 JSON</div>
              <div className="font-mono text-[10px] text-neutral-500 truncate">
                Sig: Ed25519 (64B)
              </div>
              <div className="text-[10px] text-neutral-600 pt-1 border-t border-neutral-100">
                Deterministic JCS
              </div>
            </div>

            {/* Step 3: Monad Registry */}
            <div className="p-3.5 rounded-lg bg-white border border-neutral-200 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-neutral-500 font-semibold flex items-center justify-between">
                <span>3. Monad Testnet</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
              </div>
              <div className="font-semibold text-neutral-900 truncate">Chain 10143</div>
              <div className="font-mono text-[10px] text-neutral-500 truncate">
                State: 0xeB3Ef...
              </div>
              <div className="text-[10px] text-neutral-600 pt-1 border-t border-neutral-100">
                Authorized Publisher
              </div>
            </div>

            {/* Step 4: Verdict */}
            <div className="p-3.5 rounded-lg bg-white border border-emerald-300 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-emerald-700 font-semibold flex items-center justify-between">
                <span>4. Final Verdict</span>
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="font-semibold text-emerald-900 truncate">Integrity Match</div>
              <div className="font-mono text-[10px] text-emerald-700 truncate">
                Pieces: 100% Valid
              </div>
              <div className="text-[10px] text-emerald-800 pt-1 border-t border-emerald-100 font-medium">
                Authorship Verified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="space-y-4 pt-4 border-t border-neutral-200">
        <div className="space-y-1">
          <h2 className="text-xs font-mono font-semibold text-neutral-500 uppercase tracking-wider">
            Capabilities
          </h2>
          <p className="text-xl font-bold tracking-tight text-neutral-950">
            A complete verification and release forensics toolkit
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-5 rounded-lg border border-neutral-200 bg-white space-y-3 hover:border-neutral-300 transition-colors">
            <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-950">
              Whole-file &amp; piece integrity
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Computes SHA-256 digests and piece checksums entirely in your browser. Localizes exact altered or corrupted chunks down to specific byte ranges.
            </p>
            <div className="pt-1">
              <Link
                href="/verify"
                className="text-xs font-semibold text-neutral-950 hover:underline inline-flex items-center space-x-1"
              >
                <span>Verify a file</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-lg border border-neutral-200 bg-white space-y-3 hover:border-neutral-300 transition-colors">
            <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-950">
              Release DNA &amp; variant forensics
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Cross-examines files sharing identical filenames to distinguish authentic vendor builds from unverified tracker repacks and superseded releases.
            </p>
            <div className="pt-1">
              <Link
                href="/dna"
                className="text-xs font-semibold text-neutral-950 hover:underline inline-flex items-center space-x-1"
              >
                <span>Compare variants</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-lg border border-neutral-200 bg-white space-y-3 hover:border-neutral-300 transition-colors">
            <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-950">
              Honest risk intelligence
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Separates publisher identity from runtime safety. Reports missing scanners as unavailable rather than fabricating clean 0-detection claims.
            </p>
            <div className="pt-1">
              <Link
                href="/risk"
                className="text-xs font-semibold text-neutral-950 hover:underline inline-flex items-center space-x-1"
              >
                <span>View risk evidence</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dark High-Contrast Monad Panel */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 text-white p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Monad Testnet Integration
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Immutable On-Chain Release Registry
            </h3>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
              Chain ID 10143
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
          Monad provides an append-only, tamper-proof registry for publisher authorizations, deterministic release digests, and permanent revocation flags. If a download mirror or DNS is compromised, attackers cannot rewrite on-chain commitments.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-neutral-400 font-sans">Contract:</span>
            <code className="text-neutral-200 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 text-[11px]">
              {registryAddress}
            </code>
            <button
              type="button"
              onClick={copyRegistryAddress}
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
              title="Copy contract address"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <a
            href={`https://testnet.monadscan.com/address/${registryAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-white inline-flex items-center space-x-1.5 underline underline-offset-2 font-sans"
          >
            <span>Inspect on MonadScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Core Principle Callout */}
      <div className="p-4 rounded-lg border-l-4 border-l-neutral-950 border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 space-y-1">
        <p className="font-bold text-neutral-950">
          Core Security Principle:
        </p>
        <p className="leading-relaxed">
          A successful hash match verifies byte-for-byte equivalence against the publisher&apos;s signed manifest. It does not analyze runtime behavior or guarantee that the software is free of security vulnerabilities.
        </p>
      </div>
    </div>
  );
}
