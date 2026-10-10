import { GitCompare, AlertCircle } from "lucide-react";
import { VariantComparator } from "@/components/release-dna/VariantComparator";

export default function ReleaseDnaPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
            <GitCompare className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-white">Release DNA & Variant Forensics</h1>
        </div>
        <p className="text-sm text-gray-400">
          Cross-examine distributed artifacts sharing identical filenames to trace authenticity, version lineage, chunk diffs, and Monad revocation status.
        </p>
      </div>

      <VariantComparator />

      <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 text-xs text-gray-400 flex items-start space-x-3">
        <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-gray-300">Forensics Principle: </span>
          An identical filename does not imply common origin. Byte-level differences distinguish authentic updates from untrusted repacks or bit-rot.
        </div>
      </div>
    </div>
  );
}
