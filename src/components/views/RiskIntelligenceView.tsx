'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Terminal,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import { RiskEvidenceItem } from '@/types/swarm';
import { MOCK_RISK_EVIDENCE } from '@/data/mockRegistry';
import { formatTimestamp } from '@/lib/crypto';

export function RiskIntelligenceView() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Vectors' },
    { id: 'PUBLISHER_ATTESTATION', label: 'Publisher Attestations' },
    { id: 'CONSENSUS_ORACLE', label: 'Consensus Oracles' },
    { id: 'CVE_DATABASE', label: 'CVE & Security DB' },
    { id: 'STATIC_ANALYSIS', label: 'Static Scanners' },
    { id: 'DYNAMIC_SANDBOX', label: 'Sandbox Clusters' },
  ];

  const filteredEvidence = MOCK_RISK_EVIDENCE.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Policy Banner: Clear Separation of Authenticity vs Scanners */}
      <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#5E6BFF]" />
            <h3 className="text-xs font-semibold text-[#E5E2E3]">
              Risk Architecture: Deterministic Authenticity vs. Heuristic Scanner Findings
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
            ZERO-TRUST AUDIT
          </span>
        </div>
        <p className="text-xs text-[#9A9DA3] leading-relaxed">
          Publisher signatures prove identity using on-chain consensus anchors. Conversely, vulnerability and malware
          detection relies on external heuristic engines. In standard local execution mode, external malware engines are{' '}
          <strong className="text-[#E5E2E3] font-mono">SCANNER_UNAVAILABLE</strong> or{' '}
          <strong className="text-[#E5E2E3] font-mono">NOT_SCANNED</strong>. SwarmTrace strictly distinguishes
          author verification from binary safety.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#9A9DA3]">Consensus Proofs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#E5E2E3] mt-1">100% Valid</div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">19/21 Monad Validators</div>
        </div>

        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#9A9DA3]">Supply Chain Attestation</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#E5E2E3] mt-1">SLSA L3</div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">Rekor Log #109481230</div>
        </div>

        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#9A9DA3]">External Scanners</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#9A9DA3] mt-1">OFFLINE</div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">Local Sandbox Only</div>
        </div>

        <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#9A9DA3]">Active Revocations</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#EF4444] mt-1">1 Advisory</div>
          <div className="text-[10px] text-[#9A9DA3] mt-0.5">MN-SEC-2026-09</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 bg-[#101112] border border-[#1B1C1E] rounded-[8px]">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#9A9DA3] shrink-0 ml-1 mr-1" />
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-mono whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? 'bg-[#151617] text-[#5E6BFF] border border-[#5E6BFF]/40'
                  : 'text-[#9A9DA3] hover:text-[#E5E2E3] hover:bg-[#151617] border border-transparent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0 self-end md:self-center">
          <span className="text-[#9A9DA3]">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#151617] border border-[#1B1C1E] focus:border-[#5E6BFF] text-xs font-mono text-[#E5E2E3] px-2 py-1 rounded-[4px] outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASS">PASS</option>
            <option value="REVOKED">REVOKED</option>
            <option value="NOT_SCANNED">NOT_SCANNED</option>
            <option value="UNAVAILABLE">UNAVAILABLE</option>
          </select>
        </div>
      </div>

      {/* Evidence Ledger Table */}
      <div className="bg-[#101112] border border-[#1B1C1E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1B1C1E] bg-[#151617]/50 text-[#9A9DA3] font-mono text-[11px]">
                <th className="py-3 px-4">Evidence Source</th>
                <th className="py-3 px-4">Vector / Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Freshness</th>
                <th className="py-3 px-4">Verifier / Target</th>
                <th className="py-3 px-4 text-right">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B1C1E]">
              {filteredEvidence.map((item) => {
                const isExpanded = expandedId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="hover:bg-[#151617] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#E5E2E3]">
                          {item.source}
                        </div>
                        <div className="text-[10px] font-mono text-[#9A9DA3] mt-0.5">
                          ID: {item.id}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#E5E2E3]">{item.type}</div>
                        <div className="text-[10px] font-mono text-[#9A9DA3]">
                          {item.category}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === 'PASS' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#22C55E] bg-[#152E22] px-2 py-0.5 rounded-[4px] border border-[#22C55E]/30">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        )}
                        {item.status === 'REVOKED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#EF4444] bg-[#2E1517] px-2 py-0.5 rounded-[4px] border border-[#EF4444]/30">
                            <XCircle className="w-3 h-3" /> REVOKED
                          </span>
                        )}
                        {item.status === 'NOT_SCANNED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#9A9DA3] bg-[#191A1C] px-2 py-0.5 rounded-[4px] border border-[#232426]">
                            <HelpCircle className="w-3 h-3" /> NOT_SCANNED
                          </span>
                        )}
                        {item.status === 'UNAVAILABLE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#F97316] bg-[#29170F] px-2 py-0.5 rounded-[4px] border border-[#F97316]/30">
                            <AlertTriangle className="w-3 h-3" /> UNAVAILABLE
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#9A9DA3]">
                        {item.freshness}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#5E6BFF] max-w-[200px] truncate">
                        {item.verifier}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
                          DEMO FINDING
                        </span>
                      </td>
                    </tr>

                    {/* Expandable detail row */}
                    {isExpanded && (
                      <tr className="bg-[#080809] border-t border-[#1B1C1E]">
                        <td colSpan={6} className="p-4 space-y-2">
                          <div className="text-[11px] font-mono text-[#9A9DA3] flex items-center justify-between">
                            <span>Recorded Timestamp: {formatTimestamp(item.timestamp)}</span>
                            <span>Vector: {item.category}</span>
                          </div>
                          <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[4px] text-xs font-mono text-[#E5E2E3]">
                            {item.details}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
