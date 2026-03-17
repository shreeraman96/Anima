import { useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export type RecorderState = 'idle' | 'recording' | 'processing';

export interface VoiceRecorder {
  state: RecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  reset: () => void;
}

// Module-level singleton so expo-av's internal state always stays in sync
let _activeRecording: Audio.Recording | null = null;

async function forceCleanup() {
  if (_activeRecording) {
    try { await _activeRecording.stopAndUnloadAsync(); } catch {}
    _activeRecording = null;
  }
}

export function useVoiceRecorder(): VoiceRecorder {
  const [state, setState] = useState<RecorderState>('idle');

  // Clean up on unmount
  useEffect(() => {
    return () => { forceCleanup(); };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.warn('[EmpathAI] Microphone permission denied');
        return;
      }

      await forceCleanup();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      _activeRecording = recording;
      setState('recording');
    } catch (err) {
      console.error('[EmpathAI] startRecording error:', err);
      _activeRecording = null;
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!_activeRecording) return null;

    setState('processing');

    try {
      await _activeRecording.stopAndUnloadAsync();
      const uri = _activeRecording.getURI();
      _activeRecording = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      return uri ?? null;
    } catch (err) {
      console.error('[EmpathAI] stopRecording error:', err);
      _activeRecording = null;
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
  }, []);

  return { state, startRecording, stopRecording, reset };
}
