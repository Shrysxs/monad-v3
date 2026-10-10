import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { QuickHashLookupModal } from '@/components/common/QuickHashLookupModal';
import { VerifiedRelease } from '@/types/swarm';
import { Outlet, useNavigate } from 'react-router-dom';

export function AppWorkspaceLayout() {
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [selectedReleaseForDna, setSelectedReleaseForDna] = useState<VerifiedRelease | null>(null);
  const navigate = useNavigate();

  // Keyboard shortcut ⌘K / Ctrl+K to open quick hash lookup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsLookupOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInspectReleaseInDna = (release: VerifiedRelease) => {
    setSelectedReleaseForDna(release);
    navigate('/app/releases');
  };

  const handleResetSession = () => {
    setSelectedReleaseForDna(null);
    navigate('/app/verify');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#070708] text-[#F0F1F2]">
      {/* Persistent Left Sidebar */}
      <Sidebar onOpenLookup={() => setIsLookupOpen(true)} />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenLookup={() => setIsLookupOpen(true)}
          onResetSession={handleResetSession}
        />

        {/* Scrollable Content Body with Context for Outlet */}
        <main className="flex-1 overflow-y-auto bg-[#080809]">
          <Outlet context={{ onInspectReleaseInDna: handleInspectReleaseInDna, selectedReleaseForDna }} />
        </main>
      </div>

      {/* Global Quick Hash Lookup Modal */}
      <QuickHashLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        onSelectRelease={handleInspectReleaseInDna}
      />
    </div>
  );
}

export default AppWorkspaceLayout;
