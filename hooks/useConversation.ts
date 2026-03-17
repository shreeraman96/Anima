import { useState, useCallback, useRef } from 'react';
import { transcribeAudio } from '../services/transcription';
import { processMessage, EmpathyResponse, ConversationMessage } from '../services/empathyEngine';
import { synthesizeAndPlay, stopCurrentPlayback } from '../services/ttsService';
import { startHapticPattern, stopHapticPattern } from '../services/hapticService';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  empathy?: EmpathyResponse;
  timestamp: number;
}

export type ConversationState =
  | 'idle'
  | 'transcribing'
  | 'thinking'
  | 'responding';

export interface ConversationHook {
  messages: Message[];
  state: ConversationState;
  currentEmotion: EmpathyResponse | null;
  error: string | null;
  processAudio: (audioUri: string) => Promise<void>;
  clearConversation: () => void;
  interruptResponse: () => void;
}

export function useConversation(): ConversationHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setStateRaw] = useState<ConversationState>('idle');
  const [currentEmotion, setCurrentEmotion] = useState<EmpathyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep refs for stale-closure-safe access inside async callbacks
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Mirror of state for synchronous read in always-listening callback
  const stateRef = useRef<ConversationState>('idle');
  const setState = useCallback((s: ConversationState) => {
    stateRef.current = s;
    setStateRaw(s);
  }, []);

  const interruptResponse = useCallback(() => {
    stopCurrentPlayback();
    stopHapticPattern();
    setState('idle');
  }, [setState]);

  const processAudio = useCallback(async (audioUri: string) => {
    // Guard against concurrent pipeline runs
    if (stateRef.current !== 'idle') return;

    setError(null);

    try {
      // ── Step 1: Transcribe ──────────────────────────────────────────────
      setState('transcribing');
      const transcript = await transcribeAudio(audioUri);

      if (!transcript || transcript.trim().length < 2) {
        setState('idle');
        return;
      }

      // Add user message immediately (feels responsive)
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: transcript,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        messagesRef.current = next;
        return next;
      });

      // ── Step 2: Empathy Engine (Claude) ─────────────────────────────────
      setState('thinking');

      const history: ConversationMessage[] = messagesRef.current
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const empathyResponse = await processMessage(transcript, history);
      setCurrentEmotion(empathyResponse);

      // Add assistant message
      const assistantMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: empathyResponse.response,
        empathy: empathyResponse,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        messagesRef.current = next;
        return next;
      });

      // ── Step 3: Haptics + TTS (concurrent) ─────────────────────────────
      startHapticPattern(empathyResponse.hapticPattern);
      setState('responding');

      await synthesizeAndPlay(
        empathyResponse.response,
        empathyResponse.emotion,
        empathyResponse.arousal,
        () => {},
        () => {
          stopHapticPattern();
          setState('idle');
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      console.error('[EmpathAI] processAudio error:', err);
      setError(message);
      stopHapticPattern();
      setState('idle');
    }
  }, [setState]);

  const clearConversation = useCallback(() => {
    interruptResponse();
    setMessages([]);
    setCurrentEmotion(null);
    setError(null);
    setState('idle');
  }, [interruptResponse, setState]);

  return {
    messages,
    state,
    currentEmotion,
    error,
    processAudio,
    clearConversation,
    interruptResponse,
  };
}
