import { Shield, Info } from "lucide-react";
import { EvidencePanel } from "@/components/risk/EvidencePanel";

export default function RiskPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
            <Shield className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Risk report</h1>
        </div>
        <p className="text-sm text-neutral-600">
          Transparent multi-source evidence audit separating publisher identity and cryptographic provenance from runtime malware inspection.
        </p>
      </div>

      <EvidencePanel />

      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-900">Evidence policy: </span>
          When no third-party malware scanner is executed, Penguin Trace explicitly reports <code className="text-neutral-900 font-mono">SCANNER_UNAVAILABLE</code>. We never fabricate a clean or 0-detection result.
        </div>
      </div>
    </div>
  );
}
