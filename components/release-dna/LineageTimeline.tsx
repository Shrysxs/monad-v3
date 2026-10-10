"use client";

import React from "react";
import type { LineageNode, LineageEdge } from "@/lib/risk/release-dna";
import { GitBranch, GitCommit, ArrowRight, ShieldCheck, ShieldAlert, Clock } from "lucide-react";

interface LineageTimelineProps {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export function LineageTimeline({ nodes, edges }: LineageTimelineProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <h4 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-purple-400" />
          <span>Release Lineage & Provenance Graph</span>
        </h4>
        <span className="text-xs text-gray-400 font-mono">
          {nodes.length} nodes · {edges.length} relationships
        </span>
      </div>

      {/* Visual node flow */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-4 overflow-x-auto">
        {nodes.map((node, index) => {
          const edge = edges.find((e) => e.source === node.id || e.target === node.id);
          const isTarget = node.isTarget;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div
                className={`p-4 rounded-xl border w-full md:w-64 space-y-2 transition-all ${
                  isTarget
                    ? "bg-purple-950/30 border-purple-600/70 shadow-lg shadow-purple-950/50"
                    : "bg-gray-900/60 border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">
                    {isTarget ? "Candidate Artifact" : "Reference Artifact"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      node.status === "ACTIVE"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : node.status === "REVOKED"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : node.status === "SUPERSEDED"
                        ? "bg-blue-950 text-blue-400 border border-blue-800"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div className="font-semibold text-xs text-white truncate" title={node.label}>
                  {node.label}
                </div>

                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>v{node.version}</span>
                  <span className="font-mono text-[10px] text-gray-500">
                    sha:{node.sha256Prefix}
                  </span>
                </div>

                <div className="text-[10px] text-gray-500 truncate">
                  Pub: <span className="text-gray-400">{node.publisherId}</span>
                </div>
              </div>

              {/* Edge connector arrow if not last */}
              {index < nodes.length - 1 && (
                <div className="flex flex-col items-center justify-center px-2 py-1 text-purple-400">
                  <div className="text-[10px] font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 mb-1">
                    {edges[0]?.relationship.replace("_", " ")}
                  </div>
                  <ArrowRight className="w-5 h-5 hidden md:block" />
                  <div className="w-0.5 h-6 bg-purple-800 md:hidden" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
