import { ShieldCheck, Info } from "lucide-react";
import { FileVerifier } from "@/components/verification/FileVerifier";

export default function VerifyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Verify a file</h1>
        </div>
        <p className="text-sm text-neutral-600">
          Verify downloaded files against publisher-signed manifests, piece hashes, and Monad Testnet commitments.
        </p>
      </div>

      <FileVerifier />

      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-900">Integrity principle: </span>
          A successful hash match verifies byte-level identity against the signed manifest. It does not establish that a file is malware-free. Files are processed entirely in your browser and never uploaded.
        </div>
      </div>
    </div>
  );
}
