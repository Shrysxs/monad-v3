import { GitBranch, Info } from "lucide-react";
import { VariantComparator } from "@/components/release-dna/VariantComparator";

export default function ReleaseDnaPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      <div className="space-y-2 border-b border-neutral-200 pb-5">
        <div className="inline-flex items-center space-x-2 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
          <span>Release DNA &amp; Lineage Forensics</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
          Release history
        </h1>
        <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
          Cross-examine distributed software artifacts sharing identical filenames to trace version lineage, identify repackaging, and verify Monad revocation status.
        </p>
      </div>

      <VariantComparator />

      {/* Structured Status Glossary */}
      <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-3 shadow-sm">
        <div className="font-bold text-neutral-950 flex items-center space-x-2 text-xs font-mono uppercase tracking-wider">
          <Info className="w-4 h-4 text-neutral-700" />
          <span>Status Glossary &amp; Lifecycle Definitions</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-neutral-600 pt-1">
          <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
            <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Active</span>
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              Currently valid release commitment registered by an authorized publisher on Monad Testnet.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
            <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              <span>Superseded</span>
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              An authentic older release that was replaced by a newer version from the same publisher.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
            <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Revoked</span>
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              A release retracted due to security vulnerabilities or compromise. Do not deploy or execute.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
            <div className="font-bold text-neutral-950 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-300" />
              <span>Demo data</span>
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              Pre-computed fixture used for testing and demonstration; not an on-chain transaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
