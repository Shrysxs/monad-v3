import React, { useState } from 'react';
import { TuxLogo } from '../common/TuxLogo';
import {
  ShieldCheck,
  GitCompare,
  Activity,
  Layers,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<'verify' | 'dna' | 'risk' | 'registry'>('verify');
  const [copiedHash, setCopiedHash] = useState(false);
  const navigate = useNavigate();

  const sampleSha256 = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleTabClick = (tab: 'verify' | 'dna' | 'risk' | 'registry') => {
    setActiveTab(tab);
  };

  const navigateToFullRoute = () => {
    const routeMap = {
      verify: '/app/verify',
      dna: '/app/releases',
      risk: '/app/risk',
      registry: '/app/registry',
    };
    navigate(routeMap[activeTab]);
  };

  return (
    <section id="dashboard-preview" className="relative px-4 sm:px-6 max-w-6xl mx-auto pb-24">
      {/* Outer Dashboard Frame matching Romer reference proportions */}
      <div className="w-full bg-[#080809] border border-[#232426] rounded-[8px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR                                                              */}
        {/* ========================================================================= */}
        <aside className="w-full md:w-56 bg-[#101112] border-b md:border-b-0 md:border-r border-[#1B1C1E] flex flex-col justify-between shrink-0 p-4">
          <div>
            {/* Sidebar Brand with Tux Mascot */}
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[#1B1C1E]">
              <div className="w-6 h-6 rounded-[4px] bg-[#151617] border border-[#232426] flex items-center justify-center p-0.5">
                <TuxLogo size={18} />
              </div>
              <span className="text-xs font-semibold text-[#F0F1F2] tracking-tight font-mono">
                PENGUIN TRACE
              </span>
            </div>

            {/* Menu Label */}
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#9A9DA3] mb-2 px-2">
              MENU
            </div>

            {/* Nav Items */}
            <nav className="space-y-1">
              <button
                onClick={() => handleTabClick('verify')}
                className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'verify'
                    ? 'bg-[#151617] text-[#F0F1F2] border border-[#232426]'
                    : 'text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#151617]/50'
                }`}
              >
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    activeTab === 'verify' ? 'text-[#5E6BFF]' : 'text-[#9A9DA3]'
                  }`}
                />
                <span>Verify</span>
              </button>

              <button
                onClick={() => handleTabClick('dna')}
                className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'dna'
                    ? 'bg-[#151617] text-[#F0F1F2] border border-[#232426]'
                    : 'text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#151617]/50'
                }`}
              >
                <GitCompare
                  className={`w-3.5 h-3.5 ${
                    activeTab === 'dna' ? 'text-[#5E6BFF]' : 'text-[#9A9DA3]'
                  }`}
                />
                <span>Release DNA</span>
              </button>

              <button
                onClick={() => handleTabClick('risk')}
                className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'risk'
                    ? 'bg-[#151617] text-[#F0F1F2] border border-[#232426]'
                    : 'text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#151617]/50'
                }`}
              >
                <Activity
                  className={`w-3.5 h-3.5 ${
                    activeTab === 'risk' ? 'text-[#5E6BFF]' : 'text-[#9A9DA3]'
                  }`}
                />
                <span>Risk Intelligence</span>
              </button>

              <button
                onClick={() => handleTabClick('registry')}
                className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                  activeTab === 'registry'
                    ? 'bg-[#151617] text-[#F0F1F2] border border-[#232426]'
                    : 'text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#151617]/50'
                }`}
              >
                <Layers
                  className={`w-3.5 h-3.5 ${
                    activeTab === 'registry' ? 'text-[#5E6BFF]' : 'text-[#9A9DA3]'
                  }`}
                />
                <span>Registry</span>
              </button>
            </nav>

            {/* Launch in Workspace action */}
            <div className="mt-4 pt-3 border-t border-[#1B1C1E]">
              <button
                onClick={navigateToFullRoute}
                className="w-full px-2.5 py-1.5 bg-[#191A1C] hover:bg-[#232426] border border-[#1B1C1E] rounded-[4px] text-[11px] font-mono text-[#F0F1F2] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Launch in App</span>
                <ArrowRight className="w-3 h-3 text-[#5E6BFF]" />
              </button>
            </div>
          </div>

          {/* Monad Testnet Connection Panel */}
          <div className="mt-6 pt-3 border-t border-[#1B1C1E]">
            <div className="p-2.5 bg-[#151617] border border-[#1B1C1E] rounded-[4px] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F0F1F2]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#31C875] animate-pulse" />
                  Monad Node
                </div>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#101112] text-[#31C875] border border-[#31C875]/30">
                  CONNECTED
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#9A9DA3] space-y-0.5">
                <div className="flex justify-between">
                  <span>Block:</span>
                  <span className="text-[#F0F1F2]">#5,081,920</span>
                </div>
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="text-[#5E6BFF]">SHA-256 Web</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[9px] font-mono text-[#9A9DA3]/70 uppercase px-1.5 py-0.5 bg-[#101112] rounded border border-[#1B1C1E]">
                DEMO DATA
              </span>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE (CENTER)                                                   */}
        {/* ========================================================================= */}
        <main className="flex-1 p-5 md:p-6 flex flex-col justify-between space-y-5 overflow-hidden">
          {/* Header titles */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#F0F1F2] tracking-tight">
                  Integrity verification
                </h2>
                <p className="text-xs text-[#9A9DA3] mt-0.5">
                  Check if a downloaded file matches a publisher-authenticated release.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#101112] text-[#9A9DA3] border border-[#1B1C1E]">
                SAMPLE RUN • DEMO DATA
              </span>
            </div>

            {/* Top 3 Stat Cards (Matching Romer Screenshot top metric row) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[6px]">
                <div className="text-[10px] font-mono text-[#9A9DA3] uppercase">
                  Release Match
                </div>
                <div className="text-sm font-bold font-mono text-[#31C875] mt-0.5">
                  100% IDENTICAL
                </div>
                <div className="text-[10px] text-[#9A9DA3] mt-0.5">0 byte variance</div>
              </div>

              <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[6px]">
                <div className="text-[10px] font-mono text-[#9A9DA3] uppercase">
                  Publisher Proof
                </div>
                <div className="text-sm font-bold font-mono text-[#5E6BFF] mt-0.5">
                  VERIFIED
                </div>
                <div className="text-[10px] text-[#9A9DA3] mt-0.5">ed25519 signing key</div>
              </div>

              <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[6px]">
                <div className="text-[10px] font-mono text-[#9A9DA3] uppercase">
                  Scanner Vector
                </div>
                <div className="text-sm font-bold font-mono text-[#E4CD19] mt-0.5">
                  NOT_SCANNED
                </div>
                <div className="text-[10px] text-[#9A9DA3] mt-0.5">Local sandbox policy</div>
              </div>
            </div>
          </div>

          {/* Artifact File Summary & SHA-256 Progress */}
          <div className="p-4 bg-[#101112] border border-[#1B1C1E] rounded-[6px] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-[#5E6BFF] shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#F0F1F2] font-mono">
                    penguin-client-v2.4.1.tar.gz
                  </div>
                  <div className="text-[10px] text-[#9A9DA3] font-mono">
                    Size: 42.8 MB • Released: Oct 08, 2026
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#152E22] text-[#31C875] border border-[#31C875]/30">
                  DIGEST READY (142ms)
                </span>
              </div>
            </div>

            {/* SHA-256 Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-[#9A9DA3]">
                <span>Browser SHA-256 Calculation</span>
                <span className="text-[#31C875] font-bold">100% Complete</span>
              </div>
              <div className="w-full h-1.5 bg-[#151617] rounded-full overflow-hidden">
                <div className="h-full bg-[#31C875] w-full" />
              </div>
            </div>
          </div>

          {/* Two Status Panels: Success + Separate Warning Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Panel 1: Success Panel */}
            <div className="p-3 bg-[#101914] border border-[#31C875]/40 rounded-[6px] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#31C875] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#F0F1F2]">
                  MATCHES AUTHENTICATED RELEASE
                </div>
                <div className="text-[10px] text-[#9A9DA3] mt-0.5">
                  Calculated digest matches canonical Monad on-chain anchor.
                </div>
              </div>
            </div>

            {/* Panel 2: Warning Panel */}
            <div className="p-3 bg-[#1C1A10] border border-[#E4CD19]/40 rounded-[6px] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#E4CD19] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#F0F1F2]">
                  Security scan: Not scanned
                </div>
                <div className="text-[10px] text-[#9A9DA3] mt-0.5">
                  Local browser verification. No external antivirus sandbox executed.
                </div>
              </div>
            </div>
          </div>

          {/* Computed Hash and Expected Release Hash Rows */}
          <div className="p-3 bg-[#070708] border border-[#1B1C1E] rounded-[6px] space-y-2 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-[#1B1C1E]">
              <span className="text-[#9A9DA3] text-[11px]">Computed SHA-256:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#31C875] text-[11px] truncate max-w-xs sm:max-w-md">
                  {sampleSha256}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 text-[#9A9DA3] hover:text-[#F0F1F2] cursor-pointer"
                  title="Copy computed hash"
                >
                  {copiedHash ? (
                    <Check className="w-3 h-3 text-[#31C875]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[#9A9DA3] text-[11px]">Expected On-Chain:</span>
              <span className="text-[#5E6BFF] text-[11px] truncate max-w-xs sm:max-w-md">
                {sampleSha256}
              </span>
            </div>
          </div>

          {/* Cryptographic Chunk Flow / Curve Chart (Matching Romer Signal Flow) */}
          <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[6px] space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono text-[#F0F1F2] font-semibold">
                Cryptographic Chunk Verification Flow
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-[#5E6BFF]">
                  <span className="w-2 h-0.5 bg-[#5E6BFF]" /> Computed Stream
                </span>
                <span className="flex items-center gap-1 text-[#17B7C8]">
                  <span className="w-2 h-0.5 border-t border-dashed border-[#17B7C8]" /> On-Chain Ledger
                </span>
              </div>
            </div>

            {/* Smooth SVG wave chart matching the exact lines in Romer's dashboard */}
            <div className="h-28 w-full relative overflow-hidden bg-[#070708] rounded-[4px] border border-[#1B1C1E] flex items-center justify-center">
              <svg
                viewBox="0 0 600 120"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                {/* Horizontal reference lines */}
                <line x1="0" y1="30" x2="600" y2="30" stroke="#1B1C1E" strokeWidth="1" />
                <line x1="0" y1="60" x2="600" y2="60" stroke="#1B1C1E" strokeWidth="1" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#1B1C1E" strokeWidth="1" />

                {/* Cyan dashed expected line */}
                <path
                  d="M 0,95 Q 120,105 240,75 T 480,95 T 600,60"
                  fill="none"
                  stroke="#17B7C8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Primary Indigo smooth line matching Romer */}
                <path
                  d="M 0,85 Q 130,50 250,90 T 490,75 T 600,30"
                  fill="none"
                  stroke="#5E6BFF"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>

          {/* Release Version and Publisher Metadata */}
          <div className="p-3 bg-[#101112] border border-[#1B1C1E] rounded-[6px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-[#9A9DA3]">Version Tag:</span>
              <div className="text-[#F0F1F2] font-bold">v2.4.1-stable</div>
            </div>
            <div>
              <span className="text-[#9A9DA3]">Publisher Org:</span>
              <div className="text-[#F0F1F2]">Penguin Security</div>
            </div>
            <div>
              <span className="text-[#9A9DA3]">Monad Anchor:</span>
              <div className="text-[#5E6BFF]">Block #5,081,920</div>
            </div>
            <div>
              <span className="text-[#9A9DA3]">Reproducible:</span>
              <div className="text-[#31C875]">Attested L3</div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* RIGHT PANEL (MATCHING "ROMER INTELLIGENCE")                                */}
        {/* ========================================================================= */}
        <aside className="w-full md:w-64 bg-[#101112] border-t md:border-t-0 md:border-l border-[#1B1C1E] p-4 flex flex-col justify-between shrink-0 space-y-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1B1C1E]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#17B7C8]" />
                <span className="text-xs font-semibold text-[#F0F1F2]">
                  Verification Evidence
                </span>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#191A1C] text-[#9A9DA3] border border-[#232426]">
                DEMO DATA
              </span>
            </div>

            {/* Live Status summary box */}
            <div className="p-3 bg-[#151617] border border-[#1B1C1E] rounded-[6px] space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#9A9DA3]">Live Status:</span>
                <span className="text-[#31C875] font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" /> Sync complete
                </span>
              </div>
              <div className="text-[10px] text-[#9A9DA3] font-mono">
                Just now • 0 latency
              </div>
            </div>

            {/* Evidence details */}
            <div className="space-y-2 text-xs">
              {/* Publisher signature status */}
              <div className="p-2.5 bg-[#080809] border border-[#1B1C1E] rounded-[4px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#9A9DA3] text-[10px] uppercase font-mono">Publisher Key</span>
                  <span className="text-[#31C875] text-[10px] font-mono">VALID</span>
                </div>
                <div className="text-[11px] font-mono text-[#F0F1F2]">
                  ed25519:7a09...core
                </div>
              </div>

              {/* Registry Record status */}
              <div className="p-2.5 bg-[#080809] border border-[#1B1C1E] rounded-[4px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#9A9DA3] text-[10px] uppercase font-mono">Monad Registry</span>
                  <span className="text-[#5E6BFF] text-[10px] font-mono">ANCHORED</span>
                </div>
                <div className="text-[11px] font-mono text-[#F0F1F2]">
                  0x3209B1...d836A
                </div>
              </div>

              {/* Malware scanner status */}
              <div className="p-2.5 bg-[#080809] border border-[#1B1C1E] rounded-[4px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#9A9DA3] text-[10px] uppercase font-mono">Scanner Vector</span>
                  <span className="text-[#E4CD19] text-[10px] font-mono">OFFLINE</span>
                </div>
                <div className="text-[10px] text-[#9A9DA3]">
                  SCANNER_UNAVAILABLE
                </div>
              </div>

              {/* Hash Chunk Visualization (64-byte chunks) */}
              <div className="p-2.5 bg-[#080809] border border-[#1B1C1E] rounded-[4px] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#9A9DA3]">Chunk Matrix</span>
                  <span className="text-[#31C875]">64/64 Verified</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 rounded-[1px] bg-[#31C875]/80"
                      title={`Chunk #${i + 1}: Valid`}
                    />
                  ))}
                </div>
              </div>

              {/* Transaction placeholder */}
              <div className="text-[10px] font-mono text-[#9A9DA3] space-y-0.5 pt-1">
                <div className="flex justify-between">
                  <span>Tx Hash:</span>
                  <span className="text-[#5E6BFF] truncate max-w-[120px]">
                    0x4f92c108...a81c
                  </span>
                </div>
                <div className="text-[9px] text-right text-[#9A9DA3]/70">
                  (SIMULATED DEMO LEDGER)
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card (Matching Romer's "Blocking Approval" box and blue button) */}
          <div className="p-3 bg-[#151617] border border-[#1B1C1E] rounded-[6px] space-y-2 mt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E4CD19]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Attestation Notice</span>
            </div>
            <p className="text-[10px] text-[#9A9DA3] leading-relaxed">
              Authenticity proves author identity only. Malware scan status is unexecuted.
            </p>
            <button
              onClick={() => navigate('/app/risk')}
              className="w-full py-1.5 rounded-[4px] bg-[#5E6BFF] hover:bg-[#4E5BEE] text-white text-xs font-medium transition-colors cursor-pointer text-center"
            >
              Review Audit Record
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default DashboardPreview;
