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
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-neutral-700" />
          <span>Release Lineage &amp; Provenance Graph</span>
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
                className={`p-4 rounded-xl border w-full md:w-64 space-y-2.5 transition-all shadow-sm ${
                  isTarget
                    ? "bg-neutral-950 text-white border-neutral-900"
                    : "bg-white text-neutral-950 border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-mono font-semibold ${
                      isTarget ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {isTarget ? "Candidate" : "Reference"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      node.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : node.status === "REVOKED"
                        ? "bg-red-100 text-red-900 border-red-300"
                        : node.status === "SUPERSEDED"
                        ? isTarget
                          ? "bg-neutral-800 text-neutral-300 border-neutral-700"
                          : "bg-neutral-100 text-neutral-800 border-neutral-300"
                        : isTarget
                        ? "bg-neutral-800 text-neutral-300 border-neutral-700"
                        : "bg-neutral-100 text-neutral-700 border-neutral-200"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div
                  className={`font-bold text-xs truncate ${
                    isTarget ? "text-white" : "text-neutral-950"
                  }`}
                  title={node.label}
                >
                  {node.label}
                </div>

                <div
                  className={`text-[11px] flex items-center justify-between ${
                    isTarget ? "text-neutral-300" : "text-neutral-600"
                  }`}
                >
                  <span className="font-semibold">v{node.version}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      isTarget ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    sha:{node.sha256Prefix}
                  </span>
                </div>

                <div
                  className={`text-[10px] truncate pt-1 border-t ${
                    isTarget
                      ? "border-neutral-800 text-neutral-400"
                      : "border-neutral-100 text-neutral-500"
                  }`}
                >
                  Publisher:{" "}
                  <span className={isTarget ? "text-neutral-200" : "text-neutral-800"}>
                    {node.publisherId}
                  </span>
                </div>
              </div>

              {/* Edge connector arrow if not last */}
              {index < nodes.length - 1 && (
                <div className="flex flex-col items-center justify-center px-1 text-neutral-500">
                  <div className="text-[10px] font-mono font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-200 mb-1">
                    {edges[0]?.relationship.replace(/_/g, " ")}
                  </div>
                  <ArrowRight className="w-5 h-5 hidden md:block text-neutral-700" />
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
