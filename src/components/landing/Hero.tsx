import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  onStartVerification?: () => void;
  onExplorePlatform?: () => void;
}

export function Hero({ onStartVerification, onExplorePlatform }: HeroProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    if (onStartVerification) {
      onStartVerification();
    } else {
      navigate('/app/verify');
    }
  };

  const handleExplore = () => {
    if (onExplorePlatform) {
      onExplorePlatform();
    } else {
      const el = document.getElementById('dashboard-preview');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-20 pb-12 px-6 max-w-4xl mx-auto text-center">
      {/* Main Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#F0F1F2] leading-[1.1] mb-5">
        Trust the release.
        <br />
        <span className="text-[#5E6BFF]">Verify the bytes.</span>
      </h1>

      {/* Supporting Copy */}
      <p className="text-sm sm:text-base text-[#9A9DA3] max-w-xl mx-auto leading-relaxed mb-8">
        Trace file integrity, release lineage, and security evidence before you trust a download.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
        <button
          onClick={handleStart}
          className="w-full sm:w-auto px-5 py-2.5 rounded-[4px] bg-[#5E6BFF] hover:bg-[#4E5BEE] text-white text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Start verification</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleExplore}
          className="w-full sm:w-auto px-5 py-2.5 rounded-[4px] bg-[#101112] hover:bg-[#151617] border border-[#232426] hover:border-[#1B1C1E] text-[#F0F1F2] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          Explore the platform
        </button>
      </div>

      {/* Three Compact Trust Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-mono text-[#9A9DA3]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#31C875]" />
          <span>Local-first verification</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#17B7C8]" />
          <span>SHA-256 integrity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5E6BFF]" />
          <span>Auditable release registry</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
