'use client';

import React, { useState } from 'react';
import { Search, X, Check, Copy, AlertTriangle, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { MOCK_REGISTRY_RELEASES } from '@/data/mockRegistry';
import { truncateHash, formatBytes } from '@/lib/crypto';
import { VerifiedRelease } from '@/types/swarm';

interface QuickHashLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRelease?: (release: VerifiedRelease) => void;
}

export function QuickHashLookupModal({
  isOpen,
  onClose,
  onSelectRelease,
}: QuickHashLookupModalProps) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const matched = trimmed
    ? MOCK_REGISTRY_RELEASES.filter(
        (r) =>
          r.sha256.toLowerCase().includes(trimmed) ||
          r.name.toLowerCase().includes(trimmed) ||
          r.version.toLowerCase().includes(trimmed) ||
          r.fileName.toLowerCase().includes(trimmed)
      )
    : [];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-2xl bg-[#101112] border border-[#1B1C1E] rounded-[8px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1B1C1E] flex items-center justify-between bg-[#151617]/50">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#5E6BFF]" />
            <span className="text-sm font-medium text-[#E5E2E3]">
              Quick Hash & Registry Inspector
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[4px] bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
              Demo Registry
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#9A9DA3] hover:text-[#E5E2E3] hover:bg-[#191A1C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="p-5 border-b border-[#1B1C1E] bg-[#080809]">
          <div className="relative">
            <input
              type="text"
              placeholder="Paste SHA-256 hash (e.g. 9f86d0818...) or search release name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#101112] border border-[#1B1C1E] focus:border-[#5E6BFF] text-xs font-mono text-[#E5E2E3] placeholder-[#9A9DA3]/60 px-3 py-2.5 rounded-[4px] outline-none transition-colors"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9A9DA3] hover:text-[#E5E2E3]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div className="mt-3 flex flex-wrap gap-2 items-center text-[11px] text-[#9A9DA3]">
            <span className="text-[#9A9DA3]/70 font-mono">Presets:</span>
            <button
              onClick={() => setQuery('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')}
              className="px-2 py-0.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px] hover:border-[#5E6BFF] text-[#E5E2E3] font-mono text-[10px] transition-colors"
            >
              v0.8.2 Valid
            </button>
            <button
              onClick={() => setQuery('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')}
              className="px-2 py-0.5 bg-[#2E1517] border border-[#EF4444]/40 rounded-[4px] hover:border-[#EF4444] text-[#EF4444] font-mono text-[10px] transition-colors"
            >
              v0.8.2-rc1 Revoked
            </button>
            <button
              onClick={() => setQuery('2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae')}
              className="px-2 py-0.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px] hover:border-[#5E6BFF] text-[#E5E2E3] font-mono text-[10px] transition-colors"
            >
              Relayer v1.4.0
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-3">
          {trimmed === '' ? (
            <div className="py-8 text-center text-xs text-[#9A9DA3]">
              Enter a 64-character SHA-256 hexadecimal digest or artifact name to search the Monad provenance registry.
            </div>
          ) : matched.length > 0 ? (
            matched.map((rel) => (
              <div
                key={rel.id}
                className="p-3.5 bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] rounded-[6px] flex flex-col gap-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rel.revoked?.isRevoked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#EF4444] bg-[#2E1517] px-2 py-0.5 rounded-[4px] border border-[#EF4444]/30">
                        <ShieldAlert className="w-3 h-3" /> REVOKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#22C55E] bg-[#152E22] px-2 py-0.5 rounded-[4px] border border-[#22C55E]/30">
                        <ShieldCheck className="w-3 h-3" /> VERIFIED
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#E5E2E3]">
                      {rel.name}
                    </span>
                    <span className="text-[11px] text-[#9A9DA3] font-mono">
                      {rel.tag}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#9A9DA3] font-mono">
                    {formatBytes(rel.fileSize)}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#101112] px-2.5 py-1.5 rounded-[4px] border border-[#1B1C1E]">
                  <code className="text-[11px] text-[#5E6BFF] font-mono">
                    {truncateHash(rel.sha256, 16, 16)}
                  </code>
                  <button
                    onClick={() => handleCopy(rel.sha256)}
                    className="p-1 text-[#9A9DA3] hover:text-[#E5E2E3] transition-colors"
                    title="Copy full hash"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="text-[11px] text-[#9A9DA3] flex items-center justify-between">
                  <span>Publisher: <span className="text-[#E5E2E3] font-mono">{truncateHash(rel.publisher.address, 6, 4)}</span></span>
                  <span>Block: <span className="font-mono text-[#E5E2E3]">#{rel.monadBlockNumber.toLocaleString()}</span></span>
                </div>

                {onSelectRelease && (
                  <button
                    onClick={() => {
                      onSelectRelease(rel);
                      onClose();
                    }}
                    className="mt-1 w-full py-1.5 bg-[#191A1C] hover:bg-[#232426] text-xs font-medium text-[#E5E2E3] rounded-[4px] flex items-center justify-center gap-1.5 transition-colors border border-[#1B1C1E]"
                  >
                    View in Release DNA <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 bg-[#151617] border border-[#1B1C1E] rounded-[6px] text-center">
              <AlertTriangle className="w-5 h-5 text-[#EAB308] mx-auto mb-1.5" />
              <div className="text-xs font-medium text-[#E5E2E3]">Digest Not Registered</div>
              <p className="text-[11px] text-[#9A9DA3] mt-1 max-w-md mx-auto">
                No matching artifact found for this query in the current Monad Provenance Registry.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1B1C1E] bg-[#151617]/50 flex items-center justify-between text-[11px] text-[#9A9DA3]">
          <span>Source: Monad Contract 0x3209B1... (Simulated Testnet)</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#191A1C] hover:bg-[#232426] text-[#E5E2E3] rounded-[4px] transition-colors border border-[#1B1C1E]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
