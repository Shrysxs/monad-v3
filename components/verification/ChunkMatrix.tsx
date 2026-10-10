"use client";

import React, { useState } from "react";
import type { ChunkIntegrityResult } from "@/lib/verification/types";
import { Check, X, Copy, CheckCheck, Layers } from "lucide-react";

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
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
        <div className="space-y-0.5">
          <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-700" />
            <span>Piece / Chunk Integrity Matrix</span>
          </h4>
          <p className="text-xs text-neutral-500">
            {totalChunks} pieces ({formatBytes(chunkSize)} per piece)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Check className="h-3.5 w-3.5" />
            <span>{matchedChunks} matched</span>
          </div>
          {mismatchedChunks > 0 && (
            <div className="flex items-center space-x-1 text-red-800 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
              <X className="h-3.5 w-3.5" />
              <span>{mismatchedChunks} altered</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of chunks */}
      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5 max-h-48 overflow-y-auto p-2 bg-neutral-50 rounded-lg border border-neutral-200">
        {chunkDetails.map((chunk) => {
          const isMatch = chunk.status === "MATCH";
          const isSelected = selectedChunk?.chunkIndex === chunk.chunkIndex;

          return (
            <button
              key={chunk.chunkIndex}
              type="button"
              onClick={() => setSelectedChunk(chunk)}
              title={`Piece #${chunk.chunkIndex}: ${chunk.status}`}
              className={`h-7 rounded flex items-center justify-center text-[11px] font-mono font-medium transition-all ${
                isMatch
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                  : "bg-red-50 border border-red-300 text-red-900 hover:bg-red-100 font-bold"
              } ${isSelected ? "ring-2 ring-neutral-950 scale-105" : ""}`}
            >
              #{chunk.chunkIndex}
            </button>
          );
        })}
      </div>

      {/* Detailed inspector for clicked chunk - dark high contrast surface */}
      {selectedChunk ? (
        <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-2 text-white">
          <div className="flex justify-between items-center font-sans font-semibold">
            <span className="text-neutral-200">Piece #{selectedChunk.chunkIndex} Digest Inspection</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                selectedChunk.status === "MATCH"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                  : "bg-red-950 text-red-400 border border-red-700"
              }`}
            >
              {selectedChunk.status === "MATCH" ? "MATCH" : "CORRUPT / ALTERED"}
            </span>
          </div>
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex items-center justify-between text-neutral-400 gap-2">
              <span className="truncate">
                Computed: <span className="text-neutral-100">{selectedChunk.computedSha256}</span>
              </span>
              <button
                type="button"
                onClick={() => copyText("computed", selectedChunk.computedSha256)}
                className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                title="Copy computed piece hash"
              >
                {copiedKey === "computed" ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-neutral-400 gap-2">
              <span className="truncate">
                Expected: <span className="text-neutral-300">{selectedChunk.expectedSha256}</span>
              </span>
              <button
                type="button"
                onClick={() => copyText("expected", selectedChunk.expectedSha256)}
                className="text-neutral-400 hover:text-white shrink-0 p-0.5"
                title="Copy expected piece hash"
              >
                {copiedKey === "expected" ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-neutral-500 font-mono">
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
