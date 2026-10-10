import React, { useState } from 'react';
import { TuxLogo } from '../common/TuxLogo';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenDashboard?: () => void;
  onOpenDocs?: () => void;
}

export function Header({ onOpenDashboard, onOpenDocs }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (route: string) => {
    setMobileMenuOpen(false);
    if (route === 'platform') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (route === 'docs') {
      onOpenDocs?.();
    } else {
      navigate(route);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1B1C1E] bg-[#070708]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity with Linux Tux Mascot (Returns to /) */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[4px] p-0.5"
          aria-label="PENGUIN TRACE - Return to Homepage"
        >
          <div className="w-8 h-8 rounded-[4px] bg-[#101112] border border-[#232426] flex items-center justify-center p-1">
            <TuxLogo size={22} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#F0F1F2] uppercase font-mono">
            PENGUIN TRACE
          </span>
        </button>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <button
            onClick={() => handleNavClick('platform')}
            className="py-1 text-xs font-medium text-[#F0F1F2] relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px]"
          >
            Platform
            <span className="absolute bottom-[-16px] left-0 right-0 h-[2px] bg-[#5E6BFF] rounded-full shadow-[0_0_8px_rgba(94,107,255,0.6)]" />
          </button>

          <button
            onClick={() => handleNavClick('/app/verify')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px]"
          >
            Verify
          </button>

          <button
            onClick={() => handleNavClick('/app/releases')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px]"
          >
            Release DNA
          </button>

          <button
            onClick={() => handleNavClick('/app/risk')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px]"
          >
            Risk Intelligence
          </button>

          <button
            onClick={() => handleNavClick('/app/registry')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px]"
          >
            Registry
          </button>

          <button
            onClick={() => handleNavClick('docs')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px]"
          >
            Docs
          </button>
        </nav>

        {/* Right: Telemetry Badge & Action Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Subtle Monad Testnet status */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#101112] border border-[#1B1C1E] text-[11px] font-mono text-[#9A9DA3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#31C875] animate-pulse" />
            <span>Monad Testnet</span>
          </div>

          {/* Blue Open Dashboard CTA */}
          <button
            onClick={() => {
              if (onOpenDashboard) onOpenDashboard();
              else navigate('/app');
            }}
            className="px-3.5 py-1.5 rounded-[4px] bg-[#5E6BFF] hover:bg-[#4E5BEE] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF]"
          >
            Open dashboard
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-[4px] bg-[#101112] border border-[#1B1C1E] text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF]"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1B1C1E] bg-[#080809] px-4 py-3 space-y-1">
          <button
            onClick={() => handleNavClick('platform')}
            className="w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium bg-[#151617] text-[#5E6BFF] border border-[#232426]"
          >
            Platform
          </button>
          <button
            onClick={() => handleNavClick('/app/verify')}
            className="w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112]"
          >
            Verify
          </button>
          <button
            onClick={() => handleNavClick('/app/releases')}
            className="w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112]"
          >
            Release DNA
          </button>
          <button
            onClick={() => handleNavClick('/app/risk')}
            className="w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112]"
          >
            Risk Intelligence
          </button>
          <button
            onClick={() => handleNavClick('/app/registry')}
            className="w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112]"
          >
            Registry
          </button>
          <button
            onClick={() => handleNavClick('docs')}
            className="w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112]"
          >
            Docs
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
