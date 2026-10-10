import { KeyRound, Info } from "lucide-react";
import { PublisherPortal } from "@/components/publisher/PublisherPortal";

export default function PublisherPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      <div className="space-y-2 border-b border-neutral-200 pb-5">
        <div className="inline-flex items-center space-x-2 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
          <span>Release Lifecycle &amp; On-Chain Commitments</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
          Publisher portal
        </h1>
        <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
          Author and sign RFC 8785 release manifests locally, commit immutable release digests to Monad Testnet, and manage authorized vendor credentials.
        </p>
      </div>

      <PublisherPortal />

      <div className="p-4 rounded-lg bg-neutral-50 border-l-4 border-l-neutral-950 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-neutral-950">Access control boundary: </span>
          <span>
            Only authorized publisher EVM addresses registered in SwarmTraceRegistry can commit releases. Only the registering publisher or contract administrator can revoke a release.
          </span>
        </div>
      </div>
    </div>
  );
}
