import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio } from 'expo-av';

// ── Tuning constants ──────────────────────────────────────────────────────────
const SPEECH_THRESHOLD         = -26;   // dBFS — above this = speech onset
const SILENCE_THRESHOLD        = -38;   // dBFS — below this = silence
const SPEECH_THRESHOLD_TTS     = -18;   // dBFS — raised threshold during TTS playback
const SILENCE_DURATION         = 1500;  // ms — silence duration before utterance ends
const DEBOUNCE_AFTER_TTS       = 500;   // ms — ignore speech detection right after TTS starts
const MIN_UTTERANCE_DURATION   = 1200;  // ms — reject utterances shorter than this
const MAX_UTTERANCE_DURATION   = 30000; // ms — force-end utterance after this
const METERING_INTERVAL        = 150;   // ms — how often to check audio levels

export type ListeningState =
  | 'initializing'
  | 'listening'
  | 'speech_detected'
  | 'processing';

export interface AlwaysListeningHook {
  state: ListeningState;
  isSpeechDetected: boolean;
  isMuted: boolean;
  toggleMute: () => void;
}

export function useAlwaysListening(
  onUtteranceReady: (uri: string) => Promise<void>,
  isResponding: boolean
): AlwaysListeningHook {
  const [state, setState]               = useState<ListeningState>('initializing');
  const [isMuted, setIsMuted]           = useState(false);

  const recordingRef              = useRef<Audio.Recording | null>(null);
  const speechStartRef            = useRef<number | null>(null);    // timestamp when speech started
  const silenceTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxUtteranceTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRespondingRef           = useRef(isResponding);
  const ttsDebounceRef            = useRef(false);
  const isMutedRef                = useRef(false);
  const isActiveRef               = useRef(false); // whether the loop should be running
  const speechStartedDuringTTSRef = useRef(false); // was onset triggered by TTS leakage?

  // Keep refs in sync with props/state
  useEffect(() => {
    const wasResponding = isRespondingRef.current;
    isRespondingRef.current = isResponding;

    // Start debounce window when TTS begins
    if (!wasResponding && isResponding) {
      ttsDebounceRef.current = true;
      setTimeout(() => { ttsDebounceRef.current = false; }, DEBOUNCE_AFTER_TTS);
    }

    // TTS just ended or was interrupted — if we captured audio during TTS playback,
    // that recording is contaminated with the speaker output. Discard it and restart
    // a fresh loop so the user's next words are captured cleanly.
    if (wasResponding && !isResponding && speechStartedDuringTTSRef.current) {
      clearSilenceTimer();
      clearMaxTimer();
      speechStartRef.current = null;
      speechStartedDuringTTSRef.current = false;
      stopCurrentRecording().then(() => {
        if (isActiveRef.current && !isMutedRef.current) startLoop();
      });
    }
  }, [isResponding, clearSilenceTimer, clearMaxTimer, stopCurrentRecording, startLoop]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearMaxTimer = useCallback(() => {
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
    }
  }, []);

  const stopCurrentRecording = useCallback(async (): Promise<string | null> => {
    const rec = recordingRef.current;
    if (!rec) return null;
    recordingRef.current = null;
    try {
      await rec.stopAndUnloadAsync();
      return rec.getURI() ?? null;
    } catch {
      return null;
    }
  }, []);

  const startLoop = useCallback(async () => {
    if (!isActiveRef.current || isMutedRef.current) return;

    // Stop any leftover recording first
    if (recordingRef.current) {
      await stopCurrentRecording();
    }

    speechStartRef.current = null;
    speechStartedDuringTTSRef.current = false;
    clearSilenceTimer();
    clearMaxTimer();

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        },
        (status) => {
          if (!status.isRecording || !isActiveRef.current) return;

          const metering = status.metering ?? -160;
          const threshold = (isRespondingRef.current && !ttsDebounceRef.current)
            ? SPEECH_THRESHOLD_TTS
            : SPEECH_THRESHOLD;

          if (metering > threshold) {
            // Speech onset
            clearSilenceTimer();

          if (!speechStartRef.current) {
            speechStartRef.current = Date.now();
            speechStartedDuringTTSRef.current = isRespondingRef.current;
            setState('speech_detected');

            // Safety: force-end after max duration
            maxUtteranceTimerRef.current = setTimeout(() => {
              finishUtterance();
            }, MAX_UTTERANCE_DURATION);
          }
        } else if (metering < SILENCE_THRESHOLD && speechStartRef.current) {
          // Silence after speech — start countdown
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              finishUtterance();
            }, SILENCE_DURATION);
          }
        }
        },
        METERING_INTERVAL
      );

      recordingRef.current = recording;
      setState('listening');
    } catch (err) {
      console.error('[EmpathAI] useAlwaysListening startLoop error:', err);
      setState('listening');
      // Retry after a short delay
      setTimeout(() => { if (isActiveRef.current) startLoop(); }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSilenceTimer, clearMaxTimer, stopCurrentRecording]);

  const finishUtterance = useCallback(async () => {
    clearSilenceTimer();
    clearMaxTimer();

    const speechStart = speechStartRef.current;
    speechStartRef.current = null;

    setState('processing');

    const uri = await stopCurrentRecording();

    // Reject too-short utterances and TTS leakage (speech that started while AI was speaking)
    const duration = speechStart ? Date.now() - speechStart : 0;
    const wasTTSLeakage = speechStartedDuringTTSRef.current;
    speechStartedDuringTTSRef.current = false;
    if (uri && duration >= MIN_UTTERANCE_DURATION && !wasTTSLeakage) {
      await onUtteranceReady(uri);
    }

    // Immediately restart the loop
    if (isActiveRef.current && !isMutedRef.current) {
      await startLoop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSilenceTimer, clearMaxTimer, stopCurrentRecording, onUtteranceReady, startLoop]);

  const start = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      console.warn('[EmpathAI] Microphone permission denied');
      return;
    }
    isActiveRef.current = true;
    await startLoop();
  }, [startLoop]);

  const stop = useCallback(async () => {
    isActiveRef.current = false;
    clearSilenceTimer();
    clearMaxTimer();
    await stopCurrentRecording();
    speechStartRef.current = null;
    setState('initializing');
  }, [clearSilenceTimer, clearMaxTimer, stopCurrentRecording]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (next) {
        // Muting — stop the recording loop
        clearSilenceTimer();
        clearMaxTimer();
        stopCurrentRecording();
        speechStartRef.current = null;
        setState('initializing');
      } else {
        // Unmuting — restart
        if (isActiveRef.current) startLoop();
      }
      return next;
    });
  }, [clearSilenceTimer, clearMaxTimer, stopCurrentRecording, startLoop]);

  // Start on mount, stop on unmount
  useEffect(() => {
    start();
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop mic when app goes to background, restart when foregrounded
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (isActiveRef.current && !isMutedRef.current) startLoop();
      } else {
        clearSilenceTimer();
        clearMaxTimer();
        stopCurrentRecording();
        speechStartRef.current = null;
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [startLoop, clearSilenceTimer, clearMaxTimer, stopCurrentRecording]);

  return {
    state,
    isSpeechDetected: state === 'speech_detected',
    isMuted,
    toggleMute,
  };
}
