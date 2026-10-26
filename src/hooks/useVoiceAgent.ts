import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentState, Message, CallSummary, CallRecord } from '../types/client.ts';

export function useVoiceAgent() {
  const [state, setState] = useState<AgentState>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSummary, setCurrentSummary] = useState<CallSummary | null>(null);
  const [activeCallRecord, setActiveCallRecord] = useState<CallRecord | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Audio references
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isMutedRef = useRef<boolean>(false);
  const stateRef = useRef<AgentState>('idle');
  const callIdRef = useRef<string | null>(null);

  // Keep refs in sync
  isMutedRef.current = isMuted;
  stateRef.current = state;
  callIdRef.current = callId;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallInternal();
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (state !== 'idle' && state !== 'ended') {
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [state]);

  // Speech synthesis fallback using browser Web Speech API
  const speakTextBrowser = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window) || isAudioMuted) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Search for Indian English voice if present
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(
      (v) =>
        v.lang === 'en-IN' ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('heera') ||
        v.name.toLowerCase().includes('veena')
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, [isAudioMuted]);

  // Play audio response from base64 WAV or fallback to speech synthesis
  const playAssistantAudio = useCallback(
    async (text: string, audioBase64?: string | null) => {
      setState('speaking');

      if (audioBase64 && !isAudioMuted) {
        try {
          if (!audioElementRef.current) {
            audioElementRef.current = new Audio();
          }
          const audio = audioElementRef.current;
          audio.src = `data:audio/wav;base64,${audioBase64}`;

          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => {
              console.warn('[Audio Playback] Error playing audio buffer, trying browser speech');
              speakTextBrowser(text, resolve);
            };
            audio.play().catch((err) => {
              console.warn('[Audio Playback] Play failed (autoplay policy or codec):', err);
              speakTextBrowser(text, resolve);
            });
          });
        } catch (e) {
          console.warn('[Audio Playback] Exception:', e);
          await new Promise<void>((resolve) => speakTextBrowser(text, resolve));
        }
      } else {
        await new Promise<void>((resolve) => speakTextBrowser(text, resolve));
      }

      // Return to listening if call still active
      if (stateRef.current !== 'ended' && stateRef.current !== 'idle') {
        setState('listening');
        startSpeechRecognition();
      }
    },
    [isAudioMuted, speakTextBrowser]
  );

  // Send user message to backend
  const handleUserSpeechTurn = useCallback(
    async (spokenText: string) => {
      const activeId = callIdRef.current;
      if (!activeId || !spokenText.trim()) return;

      // Stop recognition while thinking/speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      setInterimTranscript('');
      setState('thinking');

      // Optimistically add customer message
      const customerMsg: Message = {
        id: `msg_${Date.now()}_cust`,
        speaker: 'customer',
        text: spokenText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, customerMsg]);

      try {
        const res = await fetch(`/api/calls/${activeId}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: spokenText.trim() }),
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();

        // Add assistant message
        const assistantMsg: Message = {
          id: `msg_${Date.now()}_asst`,
          speaker: 'assistant',
          text: data.assistantText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolInvocations: data.toolInvocations || [],
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Play voice
        await playAssistantAudio(data.assistantText, data.audioBase64);
      } catch (err: unknown) {
        console.error('[Interact Error]', err);
        setErrorMessage('Encountered an issue communicating with Aria. Please try again.');
        setState('listening');
        startSpeechRecognition();
      }
    },
    [playAssistantAudio]
  );

  // Initialize Speech Recognition
  const startSpeechRecognition = useCallback(() => {
    if (isMutedRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[Speech] Browser does not support SpeechRecognition. Text input fallback available.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English recognition

      recognition.onstart = () => {
        if (stateRef.current !== 'thinking' && stateRef.current !== 'speaking') {
          setState('listening');
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interim);

        if (final.trim().length > 0) {
          setInterimTranscript('');
          handleUserSpeechTurn(final);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setHasMicPermission(false);
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[Speech Recognition error]', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart listening if still in listening state and not muted
        if (
          stateRef.current === 'listening' &&
          !isMutedRef.current &&
          callIdRef.current
        ) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setHasMicPermission(true);
    } catch (err) {
      console.warn('[SpeechRecognition init error]', err);
    }
  }, [handleUserSpeechTurn]);

  // Start Call lifecycle
  const startCall = useCallback(async () => {
    setErrorMessage(null);
    setCurrentSummary(null);
    setActiveCallRecord(null);
    setDuration(0);
    setState('connecting');

    // Request microphone access
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        // Release tracks after verification
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn('[Mic Permission Request Failed]', err);
      setHasMicPermission(false);
      // We still allow call with text fallback!
    }

    try {
      const initialGreeting =
        "Hello! I'm Aria, your Aura Skincare support assistant. How can I help you today?";

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ greeting: initialGreeting }),
      });

      if (!res.ok) {
        throw new Error('Failed to create call session on backend');
      }

      const data = await res.json();
      const newCallId = data.call.id;
      setCallId(newCallId);
      callIdRef.current = newCallId;

      // Set initial message
      const greetingMsg: Message = {
        id: `msg_init_${Date.now()}`,
        speaker: 'assistant',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([greetingMsg]);

      // Speak initial greeting
      await playAssistantAudio(initialGreeting);
    } catch (err: unknown) {
      console.error('[Start Call Error]', err);
      setErrorMessage('Could not connect to Aura Skincare Voice Service. Please check connection.');
      setState('error');
    }
  }, [playAssistantAudio]);

  // Stop call internal helper
  const stopCallInternal = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  };

  // End Call
  const endCall = useCallback(async () => {
    const activeId = callIdRef.current;
    stopCallInternal();
    setState('ended');

    if (!activeId) return;

    try {
      const res = await fetch(`/api/calls/${activeId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentSummary(data.summary || null);
        setActiveCallRecord(data.call || null);
      }
    } catch (err) {
      console.error('[End Call Error]', err);
    }
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      } else if (!next && stateRef.current === 'listening') {
        startSpeechRecognition();
      }
      return next;
    });
  }, [startSpeechRecognition]);

  // Toggle speaker audio
  const toggleAudioMute = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      if (next) {
        if (audioElementRef.current) audioElementRef.current.pause();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  // Send typed message
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!callId) {
        // If not started yet, start call first
        await startCall();
      }
      handleUserSpeechTurn(text);
    },
    [callId, handleUserSpeechTurn, startCall]
  );

  return {
    state,
    callId,
    duration,
    isMuted,
    isAudioMuted,
    messages,
    interimTranscript,
    currentSummary,
    activeCallRecord,
    errorMessage,
    hasMicPermission,
    startCall,
    endCall,
    toggleMute,
    toggleAudioMute,
    sendTextMessage,
    setErrorMessage,
  };
}
