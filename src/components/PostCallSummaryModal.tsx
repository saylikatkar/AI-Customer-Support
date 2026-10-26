import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  X,
  PhoneCall,
  Terminal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CallSummary, Message, CallRecord } from '../types/client.ts';

interface PostCallSummaryModalProps {
  summary: CallSummary | null;
  callRecord: CallRecord | null;
  onClose: () => void;
  onStartNewCall: () => void;
}

export const PostCallSummaryModal: React.FC<PostCallSummaryModalProps> = ({
  summary,
  callRecord,
  onClose,
  onStartNewCall,
}) => {
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!summary && !callRecord) return null;

  const transcript = callRecord?.transcript || [];

  const handleCopyTranscript = () => {
    const text = transcript
      .map((t) => `[${t.timestamp || ''}] ${t.speaker.toUpperCase()}: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleCopyJson = () => {
    const data = {
      call_id: callRecord?.id,
      duration_seconds: callRecord?.durationSeconds,
      summary: summary,
      tool_executions: callRecord?.toolExecutions || [],
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getResolutionBadge = (status?: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-[#E3EFE3] text-[#24542B] border-[#BEDBBE]';
      case 'ESCALATED':
        return 'bg-[#FFF2E5] text-[#8F4E08] border-[#E8CDB4]';
      case 'REQUIRES_CUSTOMER_INFO':
        return 'bg-[#FFF8E6] text-[#8C6B14] border-[#EAD5A0]';
      default:
        return 'bg-[#EAEFF7] text-[#24426A] border-[#C3D2E6]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#FAF8F5] border border-[#E8DFD1] shadow-2xl p-6 sm:p-7 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A35] text-white flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-[#1E2B21] font-medium">
                Post-Call Analysis & Summary
              </h3>
              <p className="text-xs text-[#6B796E]">
                Session ID: {callRecord?.id || 'Active'} • Duration: {callRecord?.durationSeconds || 0}s
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8DFD1]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#79887C]">
                Customer Intent
              </span>
              <p className="font-mono text-xs font-bold text-[#1F2E23] mt-1 break-words">
                {summary?.customer_intent || 'GENERAL_SUPPORT'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#E8DFD1]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#79887C]">
                Order ID
              </span>
              <p className="font-mono text-xs font-bold text-[#1F2E23] mt-1">
                {summary?.order_id || 'None Mentioned'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#E8DFD1]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#79887C]">
                Resolution Status
              </span>
              <div className="mt-1">
                <span
                  className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getResolutionBadge(
                    summary?.resolution_status
                  )}`}
                >
                  {summary?.resolution_status || 'RESOLVED'}
                </span>
              </div>
            </div>
          </div>

          {/* Structured Call Summary Narrative */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#355C3A] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Call Executive Summary</span>
            </span>
            <p className="text-sm text-[#27352A] mt-2 leading-relaxed">
              {summary?.call_summary || 'The customer spoke with Aria regarding Aura Skincare customer care.'}
            </p>
            {summary?.escalation_required && (
              <div className="mt-3 p-2.5 rounded-xl bg-[#FFF5EB] border border-[#F5D8BA] text-xs text-[#8F4E08]">
                <strong>Escalation flagged:</strong> {summary.escalation_reason || 'Human supervisor follow-up requested.'}
              </div>
            )}
          </div>

          {/* Tool Execution History */}
          {callRecord?.toolExecutions && callRecord.toolExecutions.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#355C3A] flex items-center gap-1.5 mb-2.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Verified Backend Tools Executed ({callRecord.toolExecutions.length})</span>
              </span>
              <div className="space-y-2 font-mono text-[11px]">
                {callRecord.toolExecutions.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E8DFD1] text-[#2C3B2E]"
                  >
                    <div className="flex items-center justify-between text-[#24522D] font-bold">
                      <span>⚡ {t.toolName}</span>
                      <span className="text-[10px] text-[#7C8B7E] font-normal">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#695F51] mt-1">
                      Input: {JSON.stringify(t.input)}
                    </div>
                    <div className="text-[10px] text-[#2E5A35] font-semibold mt-0.5">
                      Output: {JSON.stringify(t.output)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Chronological Transcript */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#355C3A]">
                Full Call Transcript
              </span>
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1 text-xs text-[#41694A] hover:text-[#254C2D] font-medium cursor-pointer"
              >
                {copiedTranscript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTranscript ? 'Copied' : 'Copy Transcript'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-1">
              {transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl ${
                    msg.speaker === 'customer'
                      ? 'bg-[#EBF2EB] border border-[#D5E3D5] text-[#204E27]'
                      : 'bg-[#F9F7F2] border border-[#EAE2D5] text-[#243026]'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-70">
                    {msg.speaker === 'customer' ? 'Customer' : 'Aria (Assistant)'}
                  </div>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#EFE8DC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFD6C7] bg-[#F7F4EE] hover:bg-[#EBE3D3] text-xs font-medium text-[#2F3D31] transition-colors cursor-pointer"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Transcript</span>
            </button>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFD6C7] bg-[#F7F4EE] hover:bg-[#EBE3D3] text-xs font-medium text-[#2F3D31] transition-colors cursor-pointer"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy JSON Summary</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onStartNewCall();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2D5A35] hover:bg-[#204426] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Start New Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
