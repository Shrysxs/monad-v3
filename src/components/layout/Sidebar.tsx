import React from 'react';
import {
  ShieldCheck,
  GitCompare,
  Activity,
  Cpu,
  Lock,
  ArrowLeft,
  Database,
} from 'lucide-react';
import { TuxLogo } from '../common/TuxLogo';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  onOpenLookup: () => void;
}

export function Sidebar({ onOpenLookup }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const navItems = [
    {
      path: '/app/verify',
      label: 'Live Swarm Integrity',
      sublabel: 'Cryptographic File Verification',
      icon: ShieldCheck,
      match: ['/app', '/app/verify'],
    },
    {
      path: '/app/releases',
      label: 'Release DNA',
      sublabel: 'Lineage & Artifact Diff',
      icon: GitCompare,
      match: ['/app/releases'],
    },
    {
      path: '/app/risk',
      label: 'Risk Intelligence',
      sublabel: 'Evidence & Threat Ledger',
      icon: Activity,
      match: ['/app/risk'],
    },
    {
      path: '/app/registry',
      label: 'Monad Registry',
      sublabel: 'On-Chain Ledger & Keys',
      icon: Database,
      match: ['/app/registry'],
    },
  ];

  return (
    <aside className="w-64 bg-[#080809] border-r border-[#1B1C1E] flex flex-col justify-between select-none shrink-0 min-h-screen">
      {/* Top Brand with Tux Mascot */}
      <div>
        <div className="h-16 px-5 border-b border-[#1B1C1E] flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            title="Return to Landing Page"
          >
            <div className="w-8 h-8 rounded-[4px] bg-[#101112] border border-[#232426] flex items-center justify-center p-1">
              <TuxLogo size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#F0F1F2] flex items-center gap-1.5 font-mono">
                PENGUIN TRACE
              </div>
              <div className="text-[10px] font-mono text-[#9A9DA3] tracking-wide">
                Web3 Security Provenance
              </div>
            </div>
          </div>
        </div>

        {/* Back to Landing Page link */}
        <div className="px-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full text-left px-2.5 py-1.5 rounded-[4px] text-[11px] font-mono text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3 text-[#5E6BFF]" />
            <span>Return to Landing Page</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="p-3">
          <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#9A9DA3]/70">
            Verification Protocol
          </div>
          <nav className="mt-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match.includes(currentPath);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-3 py-2.5 rounded-[4px] flex items-start gap-3 transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-[#151617] text-[#F0F1F2] border border-[#232426]'
                      : 'text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112] border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#5E6BFF] rounded-r" />
                  )}
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                      isActive ? 'text-[#5E6BFF]' : 'text-[#9A9DA3] group-hover:text-[#F0F1F2]'
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
            className="mt-1 w-full text-left px-3 py-2 rounded-[4px] bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] text-xs text-[#F0F1F2] flex items-center justify-between transition-colors cursor-pointer"
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
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F0F1F2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#31C875] animate-pulse" />
              Monad Testnet Gateway
            </div>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#152E22] text-[#31C875] border border-[#31C875]/20">
              SYNCED
            </span>
          </div>

          <div className="space-y-1 text-[10px] text-[#9A9DA3] font-mono">
            <div className="flex justify-between">
              <span>Anchor Block:</span>
              <span className="text-[#F0F1F2]">#5,081,920</span>
            </div>
            <div className="flex justify-between">
              <span>Digest Engine:</span>
              <span className="text-[#5E6BFF]">WebCrypto SHA256</span>
            </div>
            <div className="flex justify-between">
              <span>Sandbox Policy:</span>
              <span className="text-[#F0F1F2]">Strict Zero-Trust</span>
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

export default Sidebar;
