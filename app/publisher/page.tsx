import { KeyRound, Info } from "lucide-react";
import { PublisherPortal } from "@/components/publisher/PublisherPortal";

export default function PublisherPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
            <KeyRound className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Publisher portal</h1>
        </div>
        <p className="text-sm text-neutral-600">
          Sign release manifests, commit release digests to Monad Testnet, and manage authorization status.
        </p>
      </div>

      <PublisherPortal />

      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-900">Access control boundary: </span>
          Only authorized publisher EVM addresses registered by the contract administrator can commit releases. Only the registering publisher or contract administrator can revoke a release.
        </div>
      </div>
    </div>
  );
}
