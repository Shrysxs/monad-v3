"use client";

import React from "react";
import type { LineageNode, LineageEdge } from "@/lib/risk/release-dna";
import { GitBranch, ArrowRight } from "lucide-react";

interface LineageTimelineProps {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export function LineageTimeline({ nodes, edges }: LineageTimelineProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-neutral-700" />
          <span>Release lineage &amp; provenance graph</span>
        </h4>
        <span className="text-xs text-neutral-500 font-mono">
          {nodes.length} nodes · {edges.length} relations
        </span>
      </div>

      {/* Visual node flow */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-3 overflow-x-auto">
        {nodes.map((node, index) => {
          const edge = edges.find((e) => e.source === node.id || e.target === node.id);
          const isTarget = node.isTarget;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div
                className={`p-3.5 rounded-lg border w-full md:w-60 space-y-2 transition-colors ${
                  isTarget
                    ? "bg-neutral-50 border-neutral-900"
                    : "bg-white border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
                    {isTarget ? "Candidate" : "Reference"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                      node.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : node.status === "REVOKED"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : node.status === "SUPERSEDED"
                        ? "bg-neutral-100 text-neutral-800 border-neutral-200"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div className="font-semibold text-xs text-neutral-900 truncate" title={node.label}>
                  {node.label}
                </div>

                <div className="text-[11px] text-neutral-600 flex items-center justify-between">
                  <span>v{node.version}</span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    sha:{node.sha256Prefix}
                  </span>
                </div>

                <div className="text-[10px] text-neutral-500 truncate">
                  Publisher: <span className="text-neutral-800">{node.publisherId}</span>
                </div>
              </div>

              {/* Edge connector arrow if not last */}
              {index < nodes.length - 1 && (
                <div className="flex flex-col items-center justify-center px-1 text-neutral-400">
                  <div className="text-[10px] font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 mb-1">
                    {edges[0]?.relationship.replace("_", " ")}
                  </div>
                  <ArrowRight className="w-4 h-4 hidden md:block text-neutral-600" />
                  <div className="w-0.5 h-6 bg-neutral-300 md:hidden" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
