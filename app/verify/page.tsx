import { Shield, AlertCircle } from "lucide-react";
import { FileVerifier } from "@/components/verification/FileVerifier";

export default function VerifyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-white">Live Swarm Integrity</h1>
        </div>
        <p className="text-sm text-gray-400">
          Verify downloaded files against publisher-signed RFC 8785 manifests, piece hashes, and Monad Testnet release commitments.
        </p>
      </div>

      <FileVerifier />

      <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 text-xs text-gray-400 flex items-start space-x-3">
        <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-gray-300">Integrity Principle: </span>
          A successful hash match verifies identity against the signed manifest. It does not establish that a file is malware-free. Files are processed locally in your browser.
        </div>
      </div>
    </div>
  );
}
