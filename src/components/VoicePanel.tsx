import React from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { AgentState } from '../types/client.ts';

interface VoicePanelProps {
  state: AgentState;
  duration: number;
  isMuted: boolean;
  isAudioMuted: boolean;
  hasMicPermission: boolean | null;
  errorMessage: string | null;
  interimTranscript?: string;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleAudioMute: () => void;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
  state,
  duration,
  isMuted,
  isAudioMuted,
  hasMicPermission,
  errorMessage,
  interimTranscript,
  onStartCall,
  onEndCall,
  onToggleMute,
  onToggleAudioMute,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCallActive = state !== 'idle' && state !== 'ended' && state !== 'error';

  return (
    <div className="relative rounded-3xl bg-[#FFFFFF]/70 border border-[#E8DFD1] p-6 sm:p-8 backdrop-blur-sm shadow-[0_12px_40px_-20px_rgba(45,78,53,0.08)] flex flex-col items-center text-center overflow-hidden">
      {/* Decorative botanical ambient glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#DCEADB]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#F2E8DC]/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top status bar: Live Call Badge & Timer */}
      <div className="w-full flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-2">
          {isCallActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E4EFE4] text-[#24522D] border border-[#C5DDC5]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#24522D]" />
              <span className="capitalize">{state}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F3EDE3] text-[#695F51] border border-[#E0D5C3]">
              <span className="w-2 h-2 rounded-full bg-[#9E9180]" />
              {state === 'ended' ? 'Call Completed' : 'Voice Agent Ready'}
            </span>
          )}
        </div>

        {/* Call Duration */}
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#5A685D] bg-[#F7F4EE] px-2.5 py-1 rounded-lg border border-[#E8DFD1]">
          <Clock className="w-3.5 h-3.5 text-[#4E7656]" />
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Central Visualizer Orb */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Animated Rings for Speaking/Listening */}
        {state === 'speaking' && (
          <div className="absolute inset-0 -m-6 rounded-full border-2 border-[#60946C]/40 animate-ping opacity-60" />
        )}
        {state === 'listening' && (
          <div className="absolute inset-0 -m-4 rounded-full border-2 border-[#41754E]/30 animate-pulse" />
        )}

        {/* Main Avatar / Orb */}
        <div
          className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-xl relative z-10 ${
            state === 'speaking'
              ? 'bg-gradient-to-br from-[#2D5A35] to-[#183921] text-[#E7F3E7] ring-8 ring-[#A9CFA9]/40 scale-105'
              : state === 'listening'
              ? 'bg-gradient-to-br from-[#3B6A44] to-[#254B2E] text-white ring-8 ring-[#C7E3C7]/50'
              : state === 'thinking'
              ? 'bg-gradient-to-br from-[#5C6E52] to-[#394B34] text-white ring-6 ring-[#DDE5D6]/60 animate-pulse'
              : state === 'connecting'
              ? 'bg-gradient-to-br from-[#7B8B75] to-[#4F6149] text-white ring-4 ring-[#E4ECE1]'
              : 'bg-gradient-to-br from-[#385E38] to-[#234227] text-white ring-4 ring-[#E5EFE4]'
          }`}
        >
          {/* Waveform graphic inside orb */}
          <div className="flex items-center gap-1 h-10 mb-1">
            {[40, 75, 55, 90, 60, 80, 45].map((height, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-white transition-all duration-200"
                style={{
                  height:
                    state === 'speaking'
                      ? `${(height * (Math.sin(Date.now() / 150 + i) + 1.2)) / 2}%`
                      : state === 'listening'
                      ? `${(height * 0.4 * (Math.sin(Date.now() / 200 + i) + 1)) / 2}%`
                      : '18%',
                  opacity: state === 'idle' ? 0.4 : 0.9,
                }}
              />
            ))}
          </div>

          <span className="text-xs font-serif font-medium tracking-wider text-[#DCEADC]">
            ARIA
          </span>
        </div>
      </div>

      {/* Voice Persona Copy & Dynamic State Label */}
      <div className="mt-4 mb-5 max-w-sm">
        <h3 className="font-serif text-xl sm:text-2xl text-[#1E2B21] font-medium tracking-tight">
          Aria Skincare Support
        </h3>
        <p className="text-xs sm:text-sm text-[#5C6E61] mt-1 leading-relaxed">
          {state === 'idle' && "Click 'Start Voice Call' to speak directly with Aria."}
          {state === 'connecting' && 'Connecting to voice session...'}
          {state === 'listening' && 'Listening... Speak naturally to ask your question.'}
          {state === 'thinking' && 'Aria is checking our verified records...'}
          {state === 'speaking' && 'Aria is speaking...'}
          {state === 'ended' && 'Call ended. Your transcript and summary are ready below.'}
          {state === 'error' && 'Session error. Please check your microphone or retry.'}
        </p>

        {/* Live Interim Transcript Display while speaking */}
        {interimTranscript && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-[#F0EBE1] border border-[#DECDB8] text-xs italic text-[#4A4237] animate-pulse">
            “{interimTranscript}”
          </div>
        )}
      </div>

      {/* Error alert if mic was denied */}
      {hasMicPermission === false && (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-[#FDF2F0] border border-[#F3CBC5] text-xs text-[#96372D] flex items-center gap-2 max-w-md text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#C94738]" />
          <span>
            Microphone access is blocked in your browser. You can still use the <strong>text fallback input</strong> below or allow permissions in your address bar.
          </span>
        </div>
      )}

      {errorMessage && hasMicPermission !== false && (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-[#FFF8EB] border border-[#F4E1BA] text-xs text-[#8A5B14] flex items-center gap-2 max-w-md text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#B27519]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full z-10 pt-2">
        {!isCallActive ? (
          <button
            onClick={onStartCall}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#2D5A35] to-[#204427] hover:from-[#254C2C] hover:to-[#17351D] text-white font-medium text-sm shadow-md shadow-[#2D5A35]/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>Start Voice Call</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {/* Mute Mic */}
            <button
              onClick={onToggleMute}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-[#FBEBE8] border-[#E8C5BE] text-[#9A382D]'
                  : 'bg-[#F4EFE6] border-[#DFD6C7] text-[#2C3B2E] hover:bg-[#EAE2D3]'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Audio speaker toggle */}
            <button
              onClick={onToggleAudioMute}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-[#FBEBE8] border-[#E8C5BE] text-[#9A382D]'
                  : 'bg-[#F4EFE6] border-[#DFD6C7] text-[#2C3B2E] hover:bg-[#EAE2D3]'
              }`}
              title={isAudioMuted ? 'Unmute Assistant Audio' : 'Mute Assistant Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* End Call button */}
            <button
              onClick={onEndCall}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#9E392B] hover:bg-[#862D21] text-white font-medium text-sm shadow-md shadow-[#9E392B]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
