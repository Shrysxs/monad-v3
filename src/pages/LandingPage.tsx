import React, { useState } from 'react';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { Footer } from '@/components/landing/Footer';
import { DocsModal } from '@/components/common/DocsModal';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const navigate = useNavigate();

  const handleStartVerification = () => {
    navigate('/app/verify');
  };

  const handleOpenDashboard = () => {
    navigate('/app');
  };

  return (
    <div className="min-h-screen w-full bg-[#070708] text-[#F0F1F2] flex flex-col justify-between selection:bg-[#5E6BFF]/30 selection:text-white relative">
      {/* Background Dotted Grid Layer */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40 z-0 h-[700px]" />

      {/* Main Content Flow */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <Header
          onOpenDashboard={handleOpenDashboard}
          onOpenDocs={() => setIsDocsOpen(true)}
        />

        {/* Hero */}
        <Hero
          onStartVerification={handleStartVerification}
          onExplorePlatform={() => {
            const el = document.getElementById('dashboard-preview');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Dashboard Preview */}
        <DashboardPreview />
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <Footer onOpenDocs={() => setIsDocsOpen(true)} />
      </div>

      {/* Architecture Documentation Modal */}
      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}

export default LandingPage;
