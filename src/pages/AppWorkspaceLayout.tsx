import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { QuickHashLookupModal } from '@/components/common/QuickHashLookupModal';
import { DocsModal } from '@/components/common/DocsModal';
import { VerifiedRelease } from '@/types/swarm';
import { Outlet, useNavigate } from 'react-router-dom';

export function AppWorkspaceLayout() {
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#070708] text-[#F0F1F2]">
      {/* Top Navigation Bar with Platform, Verify, Release DNA, Risk, Registry, Docs */}
      <Header
        onOpenLookup={() => setIsLookupOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onResetSession={handleResetSession}
      />

      {/* Main Full-Width Content Workspace */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#080809] w-full">
        <div className="w-full min-h-full">
          <Outlet context={{ onInspectReleaseInDna: handleInspectReleaseInDna, selectedReleaseForDna }} />
        </div>
      </main>

      {/* Global Quick Hash Lookup Modal */}
      <QuickHashLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        onSelectRelease={handleInspectReleaseInDna}
      />

      {/* Technical Documentation Architecture Modal */}
      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}

export default AppWorkspaceLayout;
