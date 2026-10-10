import React, { useState, useEffect } from 'react';
import { Search, Clock, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TuxLogo } from '../common/TuxLogo';

interface HeaderProps {
  onOpenLookup: () => void;
  onOpenDocs?: () => void;
  onResetSession?: () => void;
}

export function Header({ onOpenLookup, onOpenDocs }: HeaderProps) {
  const [utcTime, setUtcTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);


  const navItems = [
    {
      label: 'Platform',
      path: '/',
      isActive: location.pathname === '/',
      onClick: () => navigate('/'),
    },
    {
      label: 'Verify',
      path: '/app/verify',
      isActive: location.pathname === '/app' || location.pathname === '/app/verify',
      onClick: () => navigate('/app/verify'),
    },
    {
      label: 'Release DNA',
      path: '/app/releases',
      isActive: location.pathname === '/app/releases',
      onClick: () => navigate('/app/releases'),
    },
    {
      label: 'Risk Intelligence',
      path: '/app/risk',
      isActive: location.pathname === '/app/risk',
      onClick: () => navigate('/app/risk'),
    },
    {
      label: 'Registry',
      path: '/app/registry',
      isActive: location.pathname === '/app/registry',
      onClick: () => navigate('/app/registry'),
    },
    {
      label: 'Docs',
      path: '#docs',
      isActive: false,
      onClick: () => onOpenDocs?.(),
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1B1C1E] bg-[#070708]/95 backdrop-blur-md shrink-0">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Tux Logo & Wordmark (Clickable return to /) */}
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

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`py-1 text-xs font-medium relative transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF] rounded-[2px] ${
                item.isActive ? 'text-[#F0F1F2]' : 'text-[#9A9DA3] hover:text-[#F0F1F2]'
              }`}
            >
              {item.label}
              {item.isActive && (
                <span className="absolute bottom-[-16px] left-0 right-0 h-[2px] bg-[#5E6BFF] rounded-full shadow-[0_0_8px_rgba(94,107,255,0.6)]" />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-3">
          {/* Monad Testnet synced pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#101112] border border-[#1B1C1E] text-[11px] font-mono text-[#9A9DA3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#31C875] animate-pulse" />
            <span>Monad Testnet</span>
          </div>

          {/* UTC Clock on desktop */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#101112] border border-[#1B1C1E] text-[11px] font-mono text-[#9A9DA3]">
            <Clock className="w-3 h-3 text-[#5E6BFF]" />
            <span className="data-tabular">{utcTime || 'SYNCHRONIZING...'}</span>
          </div>

          {/* Inspect Hash Modal Button (⌘K) */}
          <button
            onClick={onOpenLookup}
            className="px-3 py-1.5 rounded-[4px] bg-[#101112] hover:bg-[#151617] border border-[#1B1C1E] hover:border-[#232426] text-xs text-[#F0F1F2] flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF]"
            aria-label="Open Quick Hash Inspector (Command K)"
          >
            <Search className="w-3.5 h-3.5 text-[#5E6BFF]" />
            <span className="hidden sm:inline">Inspect Hash</span>
            <span className="text-[10px] font-mono text-[#9A9DA3] bg-[#070708] px-1 py-0.2 rounded border border-[#1B1C1E]">
              ⌘K
            </span>
          </button>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-[4px] bg-[#101112] border border-[#1B1C1E] text-[#9A9DA3] hover:text-[#F0F1F2] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6BFF]"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1B1C1E] bg-[#080809] px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-[4px] text-xs font-medium transition-colors flex items-center justify-between ${
                item.isActive
                  ? 'bg-[#151617] text-[#5E6BFF] border border-[#232426]'
                  : 'text-[#9A9DA3] hover:text-[#F0F1F2] hover:bg-[#101112]'
              }`}
            >
              <span>{item.label}</span>
              {item.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E6BFF]" />
              )}
            </button>
          ))}
          <div className="pt-2 border-t border-[#1B1C1E] flex items-center justify-between text-[11px] font-mono text-[#9A9DA3] px-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#31C875]" />
              Monad Testnet Gateway
            </span>
            <span>#5,081,920</span>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
