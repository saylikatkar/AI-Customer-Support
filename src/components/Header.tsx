import React from 'react';
import { Sparkles, BookOpen, History, ShieldCheck, ShoppingBag } from 'lucide-react';

interface HeaderProps {
  onOpenPolicies: () => void;
  onOpenHistory: () => void;
  onOpenOrders?: () => void;
  callCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPolicies,
  onOpenHistory,
  callCount,
}) => {
  return (
    <header className="border-b border-[#E8DFD1] bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2D4E35] to-[#1F3725] flex items-center justify-center text-[#E5F0E5] shadow-sm shadow-[#2D4E35]/20 ring-1 ring-[#3A6444]/30">
            <span className="font-serif text-2xl font-light italic">A</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl tracking-wide text-[#1B291E] font-medium">
                Aura Skincare
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8EFE8] text-[#2D5A35] border border-[#CFDFCF]">
                AI Voice Support
              </span>
            </div>
            <p className="text-xs text-[#6B786E] tracking-tight">
              Aria • Your Personal Skincare Support Assistant
            </p>
          </div>
        </div>

        {/* Status indicator & Utility links */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EBF3EB] border border-[#D5E4D5] text-xs text-[#2D5A35] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D7848] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D5A35]"></span>
            </span>
            <span>Aria Active</span>
          </div>

          <button
            onClick={onOpenPolicies}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD6C7] bg-[#F4EFE6] hover:bg-[#EBE4D8] text-xs font-medium text-[#2E3B30] transition-colors shadow-2xs cursor-pointer"
            title="Aura Skincare Brand Policies"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#3D6A47]" />
            <span className="hidden sm:inline">Brand Policies</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD6C7] bg-[#F4EFE6] hover:bg-[#EBE4D8] text-xs font-medium text-[#2E3B30] transition-colors shadow-2xs relative cursor-pointer"
            title="View Call History & Transcripts"
          >
            <History className="w-3.5 h-3.5 text-[#3D6A47]" />
            <span>Call History</span>
            {callCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#385E38] text-white">
                {callCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
