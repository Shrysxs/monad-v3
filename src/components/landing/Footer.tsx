import React from 'react';
import { TuxLogo } from '../common/TuxLogo';
import { useNavigate } from 'react-router-dom';

interface FooterProps {
  onOpenDocs?: () => void;
}

export function Footer({ onOpenDocs }: FooterProps) {
  const navigate = useNavigate();

  return (
    <footer className="w-full border-t border-[#1B1C1E] bg-[#070708] py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-10">
        {/* Left Column: Brand & Copyright */}
        <div className="space-y-4 max-w-sm">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[4px] p-0.5 text-left"
            aria-label="PENGUIN TRACE - Return to Homepage"
          >
            <div className="w-8 h-8 rounded-[4px] bg-[#101112] border border-[#232426] flex items-center justify-center p-1">
              <TuxLogo size={22} />
            </div>
            <span className="text-xs font-semibold text-[#F0F1F2] tracking-tight uppercase font-mono">
              PENGUIN TRACE
            </span>
          </button>

          <p className="text-xs text-[#9A9DA3] leading-relaxed">
            Deterministic Web3 file provenance and cryptographic integrity verification on Monad.
          </p>

          <div className="text-[11px] font-mono text-[#9A9DA3]/70 pt-2">
            © 2026 Penguin Trace. Linux Tux mascot used under permissive license. All rights reserved.
          </div>
        </div>

        {/* Right Navigation Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
          {/* Column 1: Product */}
          <div className="space-y-3">
            <div className="font-semibold text-[#F0F1F2] font-mono text-[11px] uppercase tracking-wider">
              Product
            </div>
            <ul className="space-y-2 text-[#9A9DA3]">
              <li>
                <button
                  onClick={() => navigate('/app')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/app/verify')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Live Integrity
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/app/releases')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Release DNA
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/app/risk')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Risk Intelligence
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform */}
          <div className="space-y-3">
            <div className="font-semibold text-[#F0F1F2] font-mono text-[11px] uppercase tracking-wider">
              Platform
            </div>
            <ul className="space-y-2 text-[#9A9DA3]">
              <li>
                <button
                  onClick={() => navigate('/app/registry')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Monad Registry
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenDocs?.()}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  WebCrypto Engine
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenDocs?.()}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Zero-Trust Architecture
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenDocs?.()}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  SLSA Level 3
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-3">
            <div className="font-semibold text-[#F0F1F2] font-mono text-[11px] uppercase tracking-wider">
              Resources
            </div>
            <ul className="space-y-2 text-[#9A9DA3]">
              <li>
                <button
                  onClick={() => onOpenDocs?.()}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  Documentation
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/Shrysxs/monad-v3"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F0F1F2] transition-colors block"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <button
                  onClick={() => navigate('/app/risk')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  CVE Advisories
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/app/registry')}
                  className="hover:text-[#F0F1F2] transition-colors cursor-pointer text-left"
                >
                  On-Chain Audits
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="space-y-3">
            <div className="font-semibold text-[#F0F1F2] font-mono text-[11px] uppercase tracking-wider">
              Legal
            </div>
            <ul className="space-y-2 text-[#9A9DA3]">
              <li>
                <span className="hover:text-[#F0F1F2] transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-[#F0F1F2] transition-colors cursor-pointer">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="hover:text-[#F0F1F2] transition-colors cursor-pointer">
                  Security Disclosures
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
