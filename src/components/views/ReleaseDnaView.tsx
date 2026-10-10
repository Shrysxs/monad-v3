'use client';

import React, { useState } from 'react';
import {
  GitCommit,
  GitCompare,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import { VerifiedRelease } from '@/types/swarm';
import { MOCK_REGISTRY_RELEASES } from '@/data/mockRegistry';
import { formatBytes, formatTimestamp } from '@/lib/crypto';

interface ReleaseDnaViewProps {
  initialSelectedRelease?: VerifiedRelease | null;
}

export function ReleaseDnaView({ initialSelectedRelease }: ReleaseDnaViewProps) {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(
    initialSelectedRelease?.id || MOCK_REGISTRY_RELEASES[0].id
  );
  const [compareTargetId, setCompareTargetId] = useState<string>(
    MOCK_REGISTRY_RELEASES[1].id
  );
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const selectedRelease =
    MOCK_REGISTRY_RELEASES.find((r) => r.id === selectedReleaseId) ||
    MOCK_REGISTRY_RELEASES[0];

  const compareRelease =
    MOCK_REGISTRY_RELEASES.find((r) => r.id === compareTargetId) ||
    MOCK_REGISTRY_RELEASES[1];

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Lineage list for Monad Node family
  const monadLineage = [
    {
      version: 'v0.8.1',
      date: 'Aug 14, 2026',
      status: 'superseded',
      label: 'Prior Stable',
      releaseId: 'rel-monad-node-v081',
      hash: '5e884898da28047...',
      notes: 'Initial parallel execution baseline',
    },
    {
      version: 'v0.8.2-rc1',
      date: 'Sep 20, 2026',
      status: 'revoked',
      label: 'Revoked (CVE-2026-4402)',
      releaseId: 'rel-monad-node-v082-rc1-revoked',
      hash: 'e3b0c44298fc1c1...',
      notes: 'Withdrawn due to memory safety fault in BFT pipeline',
    },
    {
      version: 'v0.8.2',
      date: 'Sep 28, 2026',
      status: 'current',
      label: 'Active Mainnet Release',
      releaseId: 'rel-monad-node-v082',
      hash: '9f86d081884c7d6...',
      notes: 'Patched BFT memory leak, reproducible toolchain v6.8',
    },
  ];

  const sizeDelta = selectedRelease.fileSize - compareRelease.fileSize;
  const blockDelta = selectedRelease.monadBlockNumber - compareRelease.monadBlockNumber;
  const hashMatch = selectedRelease.sha256 === compareRelease.sha256;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Demo Notice Banner */}
      <div className="p-3.5 bg-[#101112] border border-[#1B1C1E] rounded-[8px] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5E6BFF]" />
          <span className="font-semibold text-[#F0F1F2]">
            Release DNA & Provenance Genealogy
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
            DEMO SEED DATA
          </span>
        </div>
        <span className="text-[11px] text-[#9A9DA3] font-mono">
          Contract: 0x3209B172E9D42C128b9eEbfaC74046FE945d836A
        </span>
      </div>

      {/* Artifact Selector Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOCK_REGISTRY_RELEASES.map((rel) => {
          const isSelected = rel.id === selectedReleaseId;
          const isRevoked = rel.revoked?.isRevoked;

          return (
            <button
              key={rel.id}
              onClick={() => setSelectedReleaseId(rel.id)}
              className={`p-4 rounded-[8px] text-left transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-[#151617] border-[#5E6BFF] ring-1 ring-[#5E6BFF]/30'
                  : 'bg-[#101112] border-[#1B1C1E] hover:border-[#232426]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] bg-[#191A1C] text-[#9A9DA3]">
                  {rel.channel}
                </span>
                {isRevoked ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#2E1517] text-[#E45B5B] border border-[#E45B5B]/30 flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" /> REVOKED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#152E22] text-[#31C875] border border-[#31C875]/30 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-[#F0F1F2] truncate">
                {rel.name}
              </div>
              <div className="text-[11px] font-mono text-[#5E6BFF] mt-0.5">
                {rel.tag}
              </div>

              <div className="mt-3 pt-2 border-t border-[#1B1C1E] flex items-center justify-between text-[10px] text-[#9A9DA3] font-mono">
                <span>{formatBytes(rel.fileSize)}</span>
                <span>Block #{rel.monadBlockNumber.toLocaleString()}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Version Lineage Timeline */}
      <div className="p-5 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-[#5E6BFF]" />
            <h3 className="text-xs font-semibold text-[#F0F1F2]">
              Monad Node Consensus Lineage Timeline
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#9A9DA3]">
            Chronological DAG
          </span>
        </div>

        {/* Visual Lineage Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
          {monadLineage.map((item) => {
            const isTarget = item.releaseId === selectedReleaseId;
            return (
              <div
                key={item.version}
                onClick={() => setSelectedReleaseId(item.releaseId)}
                className={`p-3.5 rounded-[6px] border cursor-pointer transition-all ${
                  isTarget
                    ? 'bg-[#151617] border-[#5E6BFF]'
                    : 'bg-[#080809] border-[#1B1C1E] hover:border-[#232426]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.status === 'current'
                          ? 'bg-[#31C875]'
                          : item.status === 'revoked'
                          ? 'bg-[#E45B5B]'
                          : 'bg-[#9A9DA3]'
                      }`}
                    />
                    <span className="text-xs font-bold font-mono text-[#F0F1F2]">
                      {item.version}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#9A9DA3]">
                    {item.date}
                  </span>
                </div>

                <div
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] inline-block mb-2 ${
                    item.status === 'current'
                      ? 'bg-[#152E22] text-[#31C875]'
                      : item.status === 'revoked'
                      ? 'bg-[#2E1517] text-[#E45B5B]'
                      : 'bg-[#191A1C] text-[#9A9DA3]'
                  }`}
                >
                  {item.label}
                </div>

                <p className="text-[11px] text-[#9A9DA3] line-clamp-2">
                  {item.notes}
                </p>

                <div className="mt-2 text-[10px] font-mono text-[#5E6BFF] truncate">
                  SHA: {item.hash}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Artifact Comparison */}
      <div className="p-5 bg-[#101112] border border-[#1B1C1E] rounded-[8px] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1B1C1E]">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#5E6BFF]" />
            <h3 className="text-xs font-semibold text-[#F0F1F2]">
              Side-by-Side Artifact Cryptographic Diff
            </h3>
          </div>

          {/* Target comparison selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#9A9DA3]">Compare Against:</span>
            <select
              value={compareTargetId}
              onChange={(e) => setCompareTargetId(e.target.value)}
              className="bg-[#151617] border border-[#1B1C1E] focus:border-[#5E6BFF] text-xs font-mono text-[#F0F1F2] px-2.5 py-1 rounded-[4px] outline-none"
            >
              {MOCK_REGISTRY_RELEASES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.tag})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Metric Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px]">
            <div className="text-[10px] text-[#9A9DA3]">Hash Match</div>
            <div className={`mt-1 font-bold ${hashMatch ? 'text-[#31C875]' : 'text-[#E45B5B]'}`}>
              {hashMatch ? 'IDENTICAL' : 'DISTINCT DIGESTS'}
            </div>
          </div>
          <div className="p-2.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px]">
            <div className="text-[10px] text-[#9A9DA3]">Size Delta</div>
            <div className={`mt-1 font-bold ${sizeDelta > 0 ? 'text-[#17B7C8]' : sizeDelta < 0 ? 'text-[#F97316]' : 'text-[#9A9DA3]'}`}>
              {sizeDelta > 0 ? `+${formatBytes(sizeDelta)}` : sizeDelta < 0 ? `-${formatBytes(Math.abs(sizeDelta))}` : '0 bytes'}
            </div>
          </div>
          <div className="p-2.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px]">
            <div className="text-[10px] text-[#9A9DA3]">Block Delta</div>
            <div className="mt-1 font-bold text-[#F0F1F2]">
              {blockDelta > 0 ? `+${blockDelta.toLocaleString()}` : blockDelta.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px]">
            <div className="text-[10px] text-[#9A9DA3]">Revocation Delta</div>
            <div className="mt-1 font-bold text-[#F0F1F2]">
              {selectedRelease.revoked?.isRevoked !== compareRelease.revoked?.isRevoked
                ? 'STATUS DIVERGENCE'
                : 'STATUS EQUAL'}
            </div>
          </div>
        </div>

        {/* Side-by-Side Dual Column Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Artifact A */}
          <div className="p-4 bg-[#080809] border border-[#1B1C1E] rounded-[6px] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1B1C1E]">
              <div>
                <span className="text-[10px] font-mono text-[#5E6BFF] uppercase">Artifact Alpha (Base)</span>
                <div className="text-xs font-bold text-[#F0F1F2]">{selectedRelease.name}</div>
              </div>
              <span className="text-xs font-mono text-[#5E6BFF]">{selectedRelease.tag}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[10px] text-[#9A9DA3] font-mono">SHA-256 Digest:</div>
                <div className="p-2 bg-[#101112] border border-[#1B1C1E] rounded-[4px] font-mono text-[11px] text-[#5E6BFF] break-all select-all flex items-center justify-between">
                  <span>{selectedRelease.sha256}</span>
                  <button
                    onClick={() => handleCopy(selectedRelease.sha256)}
                    className="p-1 text-[#9A9DA3] hover:text-[#F0F1F2] cursor-pointer"
                  >
                    {copiedHash === selectedRelease.sha256 ? (
                      <Check className="w-3 h-3 text-[#31C875]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Binary File:</span>
                <span className="font-mono text-[#F0F1F2]">{selectedRelease.fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Payload Size:</span>
                <span className="font-mono text-[#F0F1F2]">{formatBytes(selectedRelease.fileSize)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Release Date:</span>
                <span className="font-mono text-[#F0F1F2]">{formatTimestamp(selectedRelease.releaseDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Monad Block Anchor:</span>
                <span className="font-mono text-[#F0F1F2]">#{selectedRelease.monadBlockNumber.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Publisher Key:</span>
                <span className="font-mono text-[#F0F1F2] text-[10px]">{selectedRelease.publisher.signingKeyId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9A9DA3]">Build Environment:</span>
                <span className="font-mono text-[#31C875] text-[10px] text-right truncate max-w-[200px]">
                  {selectedRelease.reproducibleBuild.buildEnvironment}
                </span>
              </div>
            </div>
          </div>

          {/* Artifact B */}
          <div className="p-4 bg-[#080809] border border-[#1B1C1E] rounded-[6px] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1B1C1E]">
              <div>
                <span className="text-[10px] font-mono text-[#9A9DA3] uppercase">Artifact Beta (Comparator)</span>
                <div className="text-xs font-bold text-[#F0F1F2]">{compareRelease.name}</div>
              </div>
              <span className="text-xs font-mono text-[#9A9DA3]">{compareRelease.tag}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[10px] text-[#9A9DA3] font-mono">SHA-256 Digest:</div>
                <div className="p-2 bg-[#101112] border border-[#1B1C1E] rounded-[4px] font-mono text-[11px] text-[#9A9DA3] break-all select-all flex items-center justify-between">
                  <span>{compareRelease.sha256}</span>
                  <button
                    onClick={() => handleCopy(compareRelease.sha256)}
                    className="p-1 text-[#9A9DA3] hover:text-[#F0F1F2] cursor-pointer"
                  >
                    {copiedHash === compareRelease.sha256 ? (
                      <Check className="w-3 h-3 text-[#31C875]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Binary File:</span>
                <span className="font-mono text-[#F0F1F2]">{compareRelease.fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Payload Size:</span>
                <span className="font-mono text-[#F0F1F2]">{formatBytes(compareRelease.fileSize)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Release Date:</span>
                <span className="font-mono text-[#F0F1F2]">{formatTimestamp(compareRelease.releaseDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Monad Block Anchor:</span>
                <span className="font-mono text-[#F0F1F2]">#{compareRelease.monadBlockNumber.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B1C1E]/50">
                <span className="text-[#9A9DA3]">Publisher Key:</span>
                <span className="font-mono text-[#F0F1F2] text-[10px]">{compareRelease.publisher.signingKeyId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9A9DA3]">Build Environment:</span>
                <span className="font-mono text-[#F0F1F2] text-[10px] text-right truncate max-w-[200px]">
                  {compareRelease.reproducibleBuild.buildEnvironment}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReleaseDnaView;
