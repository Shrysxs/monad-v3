"use client";

import React, { useState } from "react";
import type { ChunkIntegrityResult } from "@/lib/verification/types";
import { CheckCircle2, XCircle } from "lucide-react";

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

  const mismatchedChunks = totalChunks - matchedChunks;

  return (
    <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-200">
            Piece / Chunk Integrity Matrix
          </h4>
          <p className="text-xs text-gray-400">
            {totalChunks} pieces ({formatBytes(chunkSize)} per piece)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{matchedChunks} matched</span>
          </div>
          {mismatchedChunks > 0 && (
            <div className="flex items-center space-x-1 text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              <span>{mismatchedChunks} altered</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of chunks */}
      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5 max-h-48 overflow-y-auto p-1 bg-gray-900/40 rounded-lg border border-gray-800/80">
        {chunkDetails.map((chunk) => {
          const isMatch = chunk.status === "MATCH";
          const isSelected = selectedChunk?.chunkIndex === chunk.chunkIndex;

          return (
            <button
              key={chunk.chunkIndex}
              type="button"
              onClick={() => setSelectedChunk(chunk)}
              title={`Piece #${chunk.chunkIndex}: ${chunk.status}`}
              className={`h-7 rounded flex items-center justify-center text-[10px] font-mono font-medium transition-all ${
                isMatch
                  ? "bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900"
                  : "bg-rose-950/90 border border-rose-600 text-rose-200 hover:bg-rose-900 animate-pulse"
              } ${isSelected ? "ring-2 ring-cyan-400" : ""}`}
            >
              #{chunk.chunkIndex}
            </button>
          );
        })}
      </div>

      {/* Detailed inspector for clicked chunk */}
      {selectedChunk ? (
        <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs font-mono space-y-1.5">
          <div className="flex justify-between items-center text-gray-300 font-sans font-semibold">
            <span>Piece #{selectedChunk.chunkIndex} Details</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] ${
                selectedChunk.status === "MATCH"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              {selectedChunk.status}
            </span>
          </div>
          <div className="text-gray-400 truncate">
            Computed:{" "}
            <span className="text-gray-200">{selectedChunk.computedSha256}</span>
          </div>
          <div className="text-gray-400 truncate">
            Expected:{" "}
            <span className="text-gray-200">{selectedChunk.expectedSha256}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 italic">
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
