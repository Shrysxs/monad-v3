import { GitBranch, Info } from "lucide-react";
import { VariantComparator } from "@/components/release-dna/VariantComparator";

export default function ReleaseDnaPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Release history</h1>
          </div>
        </div>
        <p className="text-sm text-neutral-600">
          Release DNA &amp; variant comparison. Cross-examine distributed software artifacts, trace version lineage, and inspect Monad Testnet commitments.
        </p>
      </div>

      <VariantComparator />

      {/* Inline glossary */}
      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-3">
        <div className="font-semibold text-neutral-900 flex items-center space-x-1.5">
          <Info className="w-4 h-4 text-neutral-500" />
          <span>Status glossary</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-neutral-600">
          <div>
            <span className="font-semibold text-neutral-900">Active: </span>
            Currently valid release commitment registered by an authorized publisher on Monad Testnet.
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Superseded: </span>
            An authentic older release that was replaced by a newer version from the same publisher.
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Revoked: </span>
            A release retracted due to security vulnerabilities or compromise. Do not deploy or execute.
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Demo data: </span>
            Pre-computed fixture used for testing and demonstration; not an on-chain transaction.
          </div>
        </div>
      </div>
    </div>
  );
}
