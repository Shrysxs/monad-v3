'use client';

import React, { useState } from 'react';
import { Sidebar, ActiveTab } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LiveIntegrityView } from '@/components/views/LiveIntegrityView';
import { ReleaseDnaView } from '@/components/views/ReleaseDnaView';
import { RiskIntelligenceView } from '@/components/views/RiskIntelligenceView';
import { QuickHashLookupModal } from '@/components/common/QuickHashLookupModal';
import { VerifiedRelease } from '@/types/swarm';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrity');
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [selectedReleaseForDna, setSelectedReleaseForDna] = useState<VerifiedRelease | null>(null);

  const handleInspectReleaseInDna = (release: VerifiedRelease) => {
    setSelectedReleaseForDna(release);
    setActiveTab('dna');
  };

  const handleResetSession = () => {
    setSelectedReleaseForDna(null);
    setActiveTab('integrity');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#070708] text-[#E5E2E3]">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenLookup={() => setIsLookupOpen(true)}
          onResetSession={handleResetSession}
        />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#080809]">
          {activeTab === 'integrity' && (
            <LiveIntegrityView onInspectReleaseInDna={handleInspectReleaseInDna} />
          )}

          {activeTab === 'dna' && (
            <ReleaseDnaView initialSelectedRelease={selectedReleaseForDna} />
          )}

          {activeTab === 'risk' && <RiskIntelligenceView />}
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
