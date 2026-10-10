'use client';

import React, { useState, useEffect } from 'react';
import { ActiveTab } from './Sidebar';
import { Search, Shield, Clock, Terminal, AlertCircle, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenLookup: () => void;
  onResetSession?: () => void;
}

export function Header({ activeTab, onOpenLookup, onResetSession }: HeaderProps) {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const viewTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
    integrity: {
      title: 'Live Swarm Integrity',
      subtitle: 'Deterministic browser-side SHA-256 calculation & on-chain registry verification',
    },
    dna: {
      title: 'Release DNA & Lineage',
      subtitle: 'Cryptographic artifact comparison, byte deltas, and immutable release genealogy',
    },
    risk: {
      title: 'Risk Intelligence & Evidence',
      subtitle: 'Multi-vector transparency ledger, publisher attestations, and scanner audit status',
    },
  };

  const { title, subtitle } = viewTitles[activeTab];

  return (
    <header className="h-16 px-6 bg-[#080809] border-b border-[#1B1C1E] flex items-center justify-between shrink-0">
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm font-semibold tracking-tight text-[#E5E2E3]">
            {title}
          </h1>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#101112] text-[#9A9DA3] border border-[#1B1C1E]">
            Monad Ecosystem
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#2E1517]/50 text-[#F87171] border border-[#EF4444]/30">
            DEMO SEED ACTIVE
          </span>
        </div>
        <p className="text-[11px] text-[#9A9DA3] mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Right Telemetry & Actions */}
      <div className="flex items-center gap-3">
        {/* UTC Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#101112] border border-[#1B1C1E] text-[11px] font-mono text-[#9A9DA3]">
          <Clock className="w-3 h-3 text-[#5E6BFF]" />
          <span className="data-tabular">{utcTime || 'SYNCHRONIZING...'}</span>
        </div>

        {/* Search Hash Modal Trigger */}
        <button
          onClick={onOpenLookup}
          className="px-3 py-1.5 rounded-[4px] bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] text-xs text-[#E5E2E3] flex items-center gap-2 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-[#5E6BFF]" />
          <span>Inspect Hash</span>
        </button>

        {/* Clear / Reset action */}
        {onResetSession && (
          <button
            onClick={onResetSession}
            title="Reset active verification session"
            className="p-1.5 rounded-[4px] bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] text-[#9A9DA3] hover:text-[#E5E2E3] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
