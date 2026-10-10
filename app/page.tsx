import Link from "next/link";
import { Shield, KeyRound, Activity, ArrowRight, ExternalLink, Copy } from "lucide-react";

export default function HomePage() {
  const registryAddress = "0xeB3Ef45368cf0A28679FC6F037295fC2607deF01";

  return (
    <div className="space-y-16 py-6 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-wider">
          <span>Penguin Trace</span>
          <span>·</span>
          <span>Release Integrity Layer</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 leading-[1.15]">
          Know whether a software release is authentic.
        </h1>

        <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
          Verify file integrity, check publisher signatures, and inspect release history before trusting a download.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/verify"
            className="px-5 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm transition-colors inline-flex items-center space-x-2 shadow-sm"
          >
            <span>Verify a file</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/demo"
            className="px-5 py-2.5 rounded-md bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-900 font-medium text-sm transition-colors"
          >
            Try interactive demo
          </Link>
        </div>
      </div>

      {/* Three Simple Sections */}
      <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-neutral-200">
        <div className="space-y-2.5 p-5 rounded-lg border border-neutral-200 bg-white">
          <div className="w-8 h-8 rounded border border-neutral-200 flex items-center justify-center text-neutral-900">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">
            Verify integrity
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Check whether your file&apos;s contents match a trusted reference.
          </p>
          <div className="pt-2">
            <Link
              href="/verify"
              className="text-xs font-medium text-neutral-900 hover:underline inline-flex items-center space-x-1"
            >
              <span>Verify file</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="space-y-2.5 p-5 rounded-lg border border-neutral-200 bg-white">
          <div className="w-8 h-8 rounded border border-neutral-200 flex items-center justify-center text-neutral-900">
            <KeyRound className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">
            Trace the publisher
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Check the release signature and publisher identity.
          </p>
          <div className="pt-2">
            <Link
              href="/dna"
              className="text-xs font-medium text-neutral-900 hover:underline inline-flex items-center space-x-1"
            >
              <span>Release history</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="space-y-2.5 p-5 rounded-lg border border-neutral-200 bg-white">
          <div className="w-8 h-8 rounded border border-neutral-200 flex items-center justify-center text-neutral-900">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">
            Inspect the evidence
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            See what is verified, what is missing, and what remains unknown.
          </p>
          <div className="pt-2">
            <Link
              href="/risk"
              className="text-xs font-medium text-neutral-900 hover:underline inline-flex items-center space-x-1"
            >
              <span>Risk report</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* How Monad fits in */}
      <div className="p-6 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            How Monad fits in
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Monad is the blockchain used by Penguin Trace to publish and check release records. It provides a public, independently inspectable record of publisher authorization and release status. File hashing and signature verification happen separately.
          </p>
        </div>

        <div className="pt-2 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span className="font-sans font-medium text-neutral-800">Monad Testnet</span>
            <span className="text-neutral-400">·</span>
            <span>Chain ID 10143</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="truncate max-w-[220px] sm:max-w-none text-neutral-700">
              Registry: {registryAddress.slice(0, 8)}...{registryAddress.slice(-6)}
            </span>
            <a
              href={`https://testnet.monadscan.com/address/${registryAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-900 hover:underline font-sans inline-flex items-center space-x-1"
            >
              <span>Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Core Principle / Honesty Note */}
      <div className="p-4 rounded-md border border-neutral-200 bg-white text-xs text-neutral-600 space-y-1">
        <p className="font-semibold text-neutral-900">
          Core Security Principle:
        </p>
        <p className="leading-relaxed">
          A successful hash match verifies that your downloaded file is byte-for-byte identical to the publisher&apos;s signed release. It does not scan the file for malicious behavior or prove the software is free of security vulnerabilities.
        </p>
      </div>
    </div>
  );
}
