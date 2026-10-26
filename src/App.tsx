import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { VoicePanel } from './components/VoicePanel.tsx';
import { ConversationPanel } from './components/ConversationPanel.tsx';
import { SampleOrdersPanel } from './components/SampleOrdersPanel.tsx';
import { PostCallSummaryModal } from './components/PostCallSummaryModal.tsx';
import { CallHistoryDrawer } from './components/CallHistoryDrawer.tsx';
import { PolicyModal } from './components/PolicyModal.tsx';
import { useVoiceAgent } from './hooks/useVoiceAgent.ts';
import { Order, CallRecord } from './types/client.ts';
import { Sparkles, Shield, HeartHandshake } from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCallForModal, setSelectedCallForModal] = useState<CallRecord | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const voiceAgent = useVoiceAgent();

  // Load orders and call history on mount
  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('[Fetch orders error]', err);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        setCallHistory(data.calls || []);
      }
    } catch (err) {
      console.warn('[Fetch calls error]', err);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
    refreshHistory();
  }, [refreshOrders, refreshHistory]);

  // When a call ends, refresh history and show post-call summary modal
  useEffect(() => {
    if (voiceAgent.state === 'ended' && voiceAgent.currentSummary) {
      refreshHistory();
      refreshOrders();
      setSelectedCallForModal(voiceAgent.activeCallRecord);
      setShowSummaryModal(true);
    }
  }, [voiceAgent.state, voiceAgent.currentSummary, voiceAgent.activeCallRecord, refreshHistory, refreshOrders]);

  const handleResetOrders = async () => {
    try {
      const res = await fetch('/api/orders/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('[Reset orders error]', err);
    }
  };

  const handleQuickAsk = (query: string) => {
    voiceAgent.sendTextMessage(query);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#222E25]">
      {/* Header */}
      <Header
        onOpenPolicies={() => setIsPolicyOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        callCount={callHistory.length}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Welcome Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-[#2B4E34] via-[#213D28] to-[#162C1D] text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-[#E6F3E6] backdrop-blur-xs mb-3 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#A5D6A7]" />
              <span>Aura Skincare Intelligent Customer Care</span>
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-[#FAF7F2]">
              Real-Time AI Voice Support
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#D7E3D8] leading-relaxed">
              Speak naturally with <strong>Aria</strong>, our voice assistant. Track orders in real time, check cancellation and return eligibility, or inquire about our botanical skincare brand policies.
            </p>
          </div>
          {/* Subtle botanical backdrop circle */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        </section>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Voice Visualizer & Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <VoicePanel
              state={voiceAgent.state}
              duration={voiceAgent.duration}
              isMuted={voiceAgent.isMuted}
              isAudioMuted={voiceAgent.isAudioMuted}
              hasMicPermission={voiceAgent.hasMicPermission}
              errorMessage={voiceAgent.errorMessage}
              interimTranscript={voiceAgent.interimTranscript}
              onStartCall={voiceAgent.startCall}
              onEndCall={voiceAgent.endCall}
              onToggleMute={voiceAgent.toggleMute}
              onToggleAudioMute={voiceAgent.toggleAudioMute}
            />

            {/* Verification & Trust Badges */}
            <div className="rounded-2xl border border-[#E8DFD1] bg-white/70 p-4 grid grid-cols-2 gap-3 text-xs text-[#526356]">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#355C3A] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#1F2C22]">Verified Backend</strong>
                  <span>Deterministic tool validation on live database.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <HeartHandshake className="w-4 h-4 text-[#355C3A] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#1F2C22]">Aura Skincare Care</strong>
                  <span>Indian English voice support assistant.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Conversation & Transcript (7 cols) */}
          <div className="lg:col-span-7">
            <ConversationPanel
              messages={voiceAgent.messages}
              agentState={voiceAgent.state}
              onSendMessage={voiceAgent.sendTextMessage}
            />
          </div>
        </div>

        {/* Full-Width Sample Orders Panel */}
        <section>
          <SampleOrdersPanel
            orders={orders}
            onAskAboutOrder={handleQuickAsk}
            onResetOrders={handleResetOrders}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E8DFD1] bg-[#FAF7F2] py-6 text-center text-xs text-[#718074]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-serif tracking-wide text-[#334236]">
            © {new Date().getFullYear()} Aura Skincare India. Pure Organic Formulations.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPolicyOpen(true)}
              className="hover:text-[#254F2C] transition-colors cursor-pointer"
            >
              Shipping & Returns
            </button>
            <span>•</span>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="hover:text-[#254F2C] transition-colors cursor-pointer"
            >
              Session Transcripts
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      {showSummaryModal && (
        <PostCallSummaryModal
          summary={voiceAgent.currentSummary}
          callRecord={selectedCallForModal || voiceAgent.activeCallRecord}
          onClose={() => setShowSummaryModal(false)}
          onStartNewCall={() => {
            setShowSummaryModal(false);
            voiceAgent.startCall();
          }}
        />
      )}

      <PolicyModal
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
      />

      <CallHistoryDrawer
        isOpen={isHistoryOpen}
        calls={callHistory}
        onClose={() => setIsHistoryOpen(false)}
        onSelectCall={(call) => {
          setSelectedCallForModal(call);
          setShowSummaryModal(true);
        }}
      />
    </div>
  );
}
