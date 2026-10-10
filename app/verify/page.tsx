import { ShieldCheck, Info } from "lucide-react";
import { FileVerifier } from "@/components/verification/FileVerifier";

export default function VerifyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      <div className="space-y-2 border-b border-neutral-200 pb-5">
        <div className="inline-flex items-center space-x-2 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
          <span>Core Verification Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
          Verify a file
        </h1>
        <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
          Compute local SHA-256 digests, verify detached Ed25519 signatures over RFC 8785 manifests, and inspect on-chain commitments on Monad Testnet.
        </p>
      </div>

      <FileVerifier />

      <div className="p-4 rounded-lg bg-neutral-50 border-l-4 border-l-neutral-950 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-neutral-950">Integrity principle: </span>
          <span>
            A successful hash match verifies byte-level identity against the signed manifest. It does not establish that a file is malware-free. Files are processed entirely in your browser and are never uploaded.
          </span>
        </div>
      </div>
    </div>
  );
}
