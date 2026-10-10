import Link from "next/link";
import { Shield, GitCompare, Activity, KeyRound, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-xs text-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Monad Testnet Release Registry</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Know whether a downloaded file matches an authentic release.
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          Penguin Trace combines local cryptographic file and piece hashing, cross-variant release forensics,
          and explainable security evidence — backed by an auditable publisher release registry on Monad.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/demo"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-cyan-950/60 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Try Demo (Guided 3-Min Tour)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/verify"
            className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-medium text-sm flex items-center space-x-2 transition-colors"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Open Live Verifier</span>
          </Link>
        </div>
      </div>

      {/* Honesty Guarantees Banner */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-sm space-y-2">
        <div className="font-semibold text-gray-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Core Security & Honesty Guarantees</span>
        </div>
        <ul className="grid sm:grid-cols-3 gap-3 text-xs text-gray-400">
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Files are processed locally. Contents are never uploaded to our servers.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>A matching hash proves identity, not that a file is malware-free.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>A hash mismatch proves byte difference, never automatic malicious intent.</span>
          </li>
        </ul>
      </div>

      {/* Interactive Demo Mode Showcase Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-purple-950/60 border border-cyan-800/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-900/80 text-cyan-300 border border-cyan-700">
              GUIDED WALKTHROUGH
            </span>
            <span className="text-xs text-gray-400">Takes ~3 minutes · No wallet or gas needed</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Experience Penguin Trace in action with preloaded cryptographic fixtures
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Step through authentic release verification, 1-byte piece tamper detection, same-filename variant forensics, and transparent scanner availability reporting — all running locally in your browser.
          </p>
        </div>
        <Link
          href="/demo"
          className="shrink-0 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-cyan-950"
        >
          <span>Launch Demo Walkthrough</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Navigation Placeholders to the Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Feature 1 */}
        <Link
          href="/verify"
          className="group p-6 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-cyan-500/50 hover:bg-gray-900/80 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Live Integrity Verification
            </h2>
            <p className="text-xs text-gray-400">
              Verify local file bytes and piece manifests against publisher Ed25519 signatures and Monad release records.
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-xs font-medium text-cyan-400">
            <span>Open Verifier</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Feature 2 */}
        <Link
          href="/dna"
          className="group p-6 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-purple-500/50 hover:bg-gray-900/80 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
              Release DNA
            </h2>
            <p className="text-xs text-gray-400">
              Compare suspicious variants sharing the same filename, trace release lineage, chunk diffs, and revocations.
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-xs font-medium text-purple-400">
            <span>Compare Variants</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Feature 3 */}
        <Link
          href="/risk"
          className="group p-6 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-emerald-500/50 hover:bg-gray-900/80 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Risk Intelligence
            </h2>
            <p className="text-xs text-gray-400">
              Unified evidence panel combining provenance, on-chain revocation, and honest scanner availability reporting.
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-xs font-medium text-emerald-400">
            <span>Inspect Evidence</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Feature 4: Publisher Portal */}
        <Link
          href="/publisher"
          className="group p-6 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-900/80 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
              Publisher Portal
            </h2>
            <p className="text-xs text-gray-400">
              Authorized release commitments, deterministic state calculation, and permanent on-chain revocation on Monad.
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-xs font-medium text-blue-400">
            <span>Manage Releases</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
