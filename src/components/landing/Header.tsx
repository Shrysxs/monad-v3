import React from 'react';
import { TuxLogo } from '../common/TuxLogo';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenDashboard?: () => void;
  onOpenDocs?: () => void;
}

export function Header({ onOpenDashboard, onOpenDocs }: HeaderProps) {
  const navigate = useNavigate();

  const handleNavClick = (route: string) => {
    if (route === 'platform') {
      const el = document.getElementById('dashboard-preview');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (route === 'docs') {
      onOpenDocs?.();
    } else {
      navigate(route);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1B1C1E] bg-[#070708]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Brand Identity with Linux Tux Mascot */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-[4px] bg-[#101112] border border-[#232426] flex items-center justify-center p-1">
            <TuxLogo size={22} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#F0F1F2] uppercase font-mono">
            PENGUIN TRACE
          </span>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            onClick={() => handleNavClick('platform')}
            className="py-1 text-xs font-medium text-[#F0F1F2] relative cursor-pointer"
          >
            Platform
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5E6BFF] rounded-full" />
          </button>

          <button
            onClick={() => handleNavClick('/app/verify')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer"
          >
            Verify
          </button>

          <button
            onClick={() => handleNavClick('/app/releases')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer"
          >
            Release DNA
          </button>

          <button
            onClick={() => handleNavClick('/app/risk')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer"
          >
            Risk Intelligence
          </button>

          <button
            onClick={() => handleNavClick('docs')}
            className="py-1 text-xs font-medium text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors cursor-pointer"
          >
            Docs
          </button>
        </nav>

        {/* Right: Telemetry Badge & Action Button */}
        <div className="flex items-center gap-4">
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
            className="px-3.5 py-1.5 rounded-[4px] bg-[#5E6BFF] hover:bg-[#4E5BEE] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            Open dashboard
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
