import React from 'react';
import { History, X, Clock, FileText, ChevronRight } from 'lucide-react';
import { CallRecord } from '../types/client.ts';

interface CallHistoryDrawerProps {
  isOpen: boolean;
  calls: CallRecord[];
  onClose: () => void;
  onSelectCall: (call: CallRecord) => void;
}

export const CallHistoryDrawer: React.FC<CallHistoryDrawerProps> = ({
  isOpen,
  calls,
  onClose,
  onSelectCall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-[#FAF8F5] border-l border-[#E8DFD1] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#EFE8DC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2D5A35] text-white flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#1C2A1E] font-medium">
                Call History
              </h3>
              <p className="text-xs text-[#6B796E]">
                {calls.length} {calls.length === 1 ? 'session' : 'sessions'} recorded
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B786E] hover:bg-[#EFE8DC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {calls.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#7F8D82]">
              <History className="w-8 h-8 text-[#98A69B] mb-2" />
              <p className="text-sm font-medium text-[#2E3C31]">No Previous Calls</p>
              <p className="text-xs text-[#707E73] mt-1">
                Completed voice calls and transcripts will appear here.
              </p>
            </div>
          ) : (
            calls.map((call) => (
              <div
                key={call.id}
                onClick={() => onSelectCall(call)}
                className="p-4 rounded-2xl bg-white border border-[#E8DFD1] hover:border-[#BED6BE] hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-[#1E2E20]">
                    {call.id}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#69786C]">
                    <Clock className="w-3 h-3" />
                    <span>{call.durationSeconds}s</span>
                  </span>
                </div>

                {call.summary ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E5EFE5] text-[#24522D] border border-[#C2DBC2]">
                        {call.summary.customer_intent}
                      </span>
                      {call.summary.order_id && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3EDE3] text-[#55493A] border border-[#DFD4C3]">
                          {call.summary.order_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#4F5E52] line-clamp-2 leading-relaxed">
                      {call.summary.call_summary}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[#6F7E72] italic">
                    {call.transcript?.length || 0} transcript turns recorded.
                  </p>
                )}

                <div className="mt-3 pt-2 border-t border-[#F1EBE0] flex items-center justify-between text-[11px] text-[#345F3B] font-medium group-hover:text-[#214327]">
                  <span>View Details & Transcript</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
