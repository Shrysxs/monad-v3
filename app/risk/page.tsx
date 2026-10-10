import { Activity, AlertTriangle } from "lucide-react";
import { EvidencePanel } from "@/components/risk/EvidencePanel";

export default function RiskIntelligencePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-white">Swarm Risk Intelligence</h1>
        </div>
        <p className="text-sm text-gray-400">
          Transparent multi-source evidence panel separating publisher provenance from active security inspection, with honest scanner availability reporting.
        </p>
      </div>

      <EvidencePanel />

      <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 text-xs text-gray-400 flex items-start space-x-3">
        <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-gray-300">Evidence Policy: </span>
          When no third-party security scanner is configured, SwarmTrace reports <code className="text-emerald-300 font-mono">SCANNER_UNAVAILABLE</code>. We never fabricate a clean or 0-detection result.
        </div>
      </div>
    </div>
  );
}
