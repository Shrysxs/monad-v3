import { KeyRound, ShieldAlert } from "lucide-react";
import { PublisherPortal } from "@/components/publisher/PublisherPortal";

export default function PublisherPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-white">Publisher Registry Portal</h1>
        </div>
        <p className="text-sm text-gray-400">
          Authorized vendor release registration, deterministic state commitments, and permanent on-chain revocation on Monad Testnet.
        </p>
      </div>

      <PublisherPortal />

      <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 text-xs text-gray-400 flex items-start space-x-3">
        <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-gray-300">Access Control Boundary: </span>
          Only authorized publisher addresses registered by the contract administrator can create release commitments. Only the owning publisher or administrator can revoke a release.
        </div>
      </div>
    </div>
  );
}
