'use client';

import React from 'react';
import {
  ShieldCheck,
  GitCompare,
  Activity,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';

export type ActiveTab = 'integrity' | 'dna' | 'risk';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenLookup: () => void;
}

export function Sidebar({ activeTab, onTabChange, onOpenLookup }: SidebarProps) {
  const navItems = [
    {
      id: 'integrity' as ActiveTab,
      label: 'Live Swarm Integrity',
      sublabel: 'Cryptographic File Verification',
      icon: ShieldCheck,
      badge: 'Local SHA-256',
    },
    {
      id: 'dna' as ActiveTab,
      label: 'Release DNA',
      sublabel: 'Lineage & Artifact Diff',
      icon: GitCompare,
      badge: '5 Seeded',
    },
    {
      id: 'risk' as ActiveTab,
      label: 'Risk Intelligence',
      sublabel: 'Evidence & Threat Ledger',
      icon: Activity,
      badge: 'Zero-Trust',
    },
  ];

  return (
    <aside className="w-64 bg-[#080809] border-r border-[#1B1C1E] flex flex-col justify-between select-none shrink-0 min-h-screen">
      {/* Top Brand */}
      <div>
        <div className="h-16 px-5 border-b border-[#1B1C1E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[4px] bg-[#5E6BFF]/10 border border-[#5E6BFF]/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#5E6BFF]" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#E5E2E3] flex items-center gap-1.5">
                SwarmTrace
                <span className="text-[10px] font-mono px-1 py-0.2 bg-[#191A1C] text-[#5E6BFF] border border-[#232426] rounded-[3px]">
                  v0.9.4
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#9A9DA3] tracking-wide">
                Web3 Security Provenance
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-3">
          <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#9A9DA3]/70">
            Verification Protocol
          </div>
          <nav className="mt-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-[4px] flex items-start gap-3 transition-all relative group ${
                    isActive
                      ? 'bg-[#151617] text-[#E5E2E3] border border-[#232426]'
                      : 'text-[#9A9DA3] hover:text-[#E5E2E3] hover:bg-[#101112] border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#5E6BFF] rounded-r" />
                  )}
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                      isActive ? 'text-[#5E6BFF]' : 'text-[#9A9DA3] group-hover:text-[#E5E2E3]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium tracking-tight">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#9A9DA3] truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Tools */}
        <div className="px-3 pt-2">
          <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[#9A9DA3]/70">
            Node Operations
          </div>
          <button
            onClick={onOpenLookup}
            className="mt-1 w-full text-left px-3 py-2 rounded-[4px] bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] text-xs text-[#E5E2E3] flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#5E6BFF]" />
              <span>Registry Query</span>
            </span>
            <span className="text-[10px] font-mono text-[#9A9DA3] bg-[#080809] px-1.5 py-0.5 rounded-[3px] border border-[#1B1C1E]">
              ⌘K
            </span>
          </button>
        </div>
      </div>

      {/* Network & Node Telemetry Footer */}
      <div className="p-3 border-t border-[#1B1C1E] bg-[#070708]">
        <div className="p-2.5 rounded-[6px] bg-[#101112] border border-[#1B1C1E] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#E5E2E3]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              Monad Testnet Gateway
            </div>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#152E22] text-[#22C55E] border border-[#22C55E]/20">
              SYNCED
            </span>
          </div>

          <div className="space-y-1 text-[10px] text-[#9A9DA3] font-mono">
            <div className="flex justify-between">
              <span>Anchor Block:</span>
              <span className="text-[#E5E2E3]">#5,081,920</span>
            </div>
            <div className="flex justify-between">
              <span>Digest Engine:</span>
              <span className="text-[#5E6BFF]">WebCrypto SHA256</span>
            </div>
            <div className="flex justify-between">
              <span>Sandbox Policy:</span>
              <span className="text-[#E5E2E3]">Strict Zero-Trust</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 px-1 flex items-center justify-between text-[10px] text-[#9A9DA3]/70 font-mono">
          <span className="flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> 100% In-Browser Hash
          </span>
          <span>No Bytes Sent</span>
        </div>
      </div>
    </aside>
  );
}
