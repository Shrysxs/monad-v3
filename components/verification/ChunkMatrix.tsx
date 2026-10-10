"use client";

import React, { useState } from "react";
import type { ChunkIntegrityResult } from "@/lib/verification/types";
import { Check, X, Copy, CheckCheck } from "lucide-react";

interface ChunkMatrixProps {
  chunkDetails: ChunkIntegrityResult[];
  chunkSize: number;
  totalChunks: number;
  matchedChunks: number;
}

export function ChunkMatrix({
  chunkDetails,
  chunkSize,
  totalChunks,
  matchedChunks,
}: ChunkMatrixProps) {
  const [selectedChunk, setSelectedChunk] = useState<ChunkIntegrityResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mismatchedChunks = totalChunks - matchedChunks;

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <div>
          <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
            Piece integrity matrix
          </h4>
          <p className="text-xs text-neutral-500">
            {totalChunks} pieces ({formatBytes(chunkSize)} per piece)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1 text-emerald-700 font-medium">
            <Check className="h-3.5 w-3.5" />
            <span>{matchedChunks} matched</span>
          </div>
          {mismatchedChunks > 0 && (
            <div className="flex items-center space-x-1 text-red-700 font-medium">
              <X className="h-3.5 w-3.5" />
              <span>{mismatchedChunks} altered</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of chunks */}
      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5 max-h-48 overflow-y-auto p-1 bg-neutral-50 rounded border border-neutral-200">
        {chunkDetails.map((chunk) => {
          const isMatch = chunk.status === "MATCH";
          const isSelected = selectedChunk?.chunkIndex === chunk.chunkIndex;

          return (
            <button
              key={chunk.chunkIndex}
              type="button"
              onClick={() => setSelectedChunk(chunk)}
              title={`Piece #${chunk.chunkIndex}: ${chunk.status}`}
              className={`h-7 rounded flex items-center justify-center text-[11px] font-mono font-medium transition-colors ${
                isMatch
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                  : "bg-red-50 border border-red-300 text-red-800 hover:bg-red-100"
              } ${isSelected ? "ring-2 ring-neutral-900" : ""}`}
            >
              #{chunk.chunkIndex}
            </button>
          );
        })}
      </div>

      {/* Detailed inspector for clicked chunk */}
      {selectedChunk ? (
        <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center text-neutral-900 font-sans font-semibold">
            <span>Piece #{selectedChunk.chunkIndex} details</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                selectedChunk.status === "MATCH"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {selectedChunk.status === "MATCH" ? "Match" : "Mismatch"}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600 gap-2">
            <span className="truncate">
              Computed: <span className="text-neutral-900">{selectedChunk.computedSha256}</span>
            </span>
            <button
              type="button"
              onClick={() => copyText("computed", selectedChunk.computedSha256)}
              className="text-neutral-500 hover:text-neutral-900 shrink-0 p-0.5"
              title="Copy hash"
            >
              {copiedKey === "computed" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-neutral-600 gap-2">
            <span className="truncate">
              Expected: <span className="text-neutral-900">{selectedChunk.expectedSha256}</span>
            </span>
            <button
              type="button"
              onClick={() => copyText("expected", selectedChunk.expectedSha256)}
              className="text-neutral-500 hover:text-neutral-900 shrink-0 p-0.5"
              title="Copy hash"
            >
              {copiedKey === "expected" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-neutral-500">
          Click any piece number to inspect its computed and expected SHA-256 digests.
        </p>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
