import React from 'react';
import { TuxLogo } from '@/components/common/TuxLogo';
import { useNavigate } from 'react-router-dom';
import { Home, ShieldCheck } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#070708] text-[#F0F1F2] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-[8px] bg-[#101112] border border-[#232426] flex items-center justify-center mb-6 p-2 shadow-xl">
        <TuxLogo size={44} />
      </div>

      <div className="text-xs font-mono uppercase tracking-widest text-[#5E6BFF] mb-2">
        Error 404 • Destination Unregistered
      </div>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F0F1F2] mb-3">
        Page Not Found
      </h1>

      <p className="text-xs sm:text-sm text-[#9A9DA3] max-w-md leading-relaxed mb-8">
        The requested URL path does not exist on this node. Please verify your cryptographic route or return to a verified destination.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-[#101112] hover:bg-[#151617] border border-[#232426] text-xs font-medium text-[#F0F1F2] rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-[#5E6BFF]" />
          <span>Landing Page</span>
        </button>

        <button
          onClick={() => navigate('/app/verify')}
          className="px-4 py-2 bg-[#5E6BFF] hover:bg-[#4E5BEE] text-white text-xs font-medium rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Open Verification Workspace</span>
        </button>
      </div>
    </div>
  );
}

export default NotFoundPage;
