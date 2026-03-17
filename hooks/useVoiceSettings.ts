import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_VOICE_ID } from '../constants/voices';
import { setSelectedVoiceId } from '../services/ttsService';

const STORAGE_KEY = 'empath_voice_settings';

export interface VoiceSettingsHook {
  voiceId: string;
  isLoaded: boolean;
  setVoice: (voiceId: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export function useVoiceSettings(): VoiceSettingsHook {
  const [voiceId, setVoiceIdState] = useState<string>(DEFAULT_VOICE_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Handle migration from old {warm, steady, neutral} shape
          const id: string =
            typeof parsed === 'string'
              ? parsed
              : typeof parsed?.voiceId === 'string'
              ? parsed.voiceId
              : DEFAULT_VOICE_ID;
          setVoiceIdState(id);
          setSelectedVoiceId(id);
        } else {
          setSelectedVoiceId(DEFAULT_VOICE_ID);
        }
      } catch {
        setSelectedVoiceId(DEFAULT_VOICE_ID);
      }
      setIsLoaded(true);
    })();
  }, []);

  const setVoice = useCallback(async (id: string) => {
    setVoiceIdState(id);
    setSelectedVoiceId(id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceId: id })).catch(() => {});
  }, []);

  const resetToDefault = useCallback(async () => {
    setVoiceIdState(DEFAULT_VOICE_ID);
    setSelectedVoiceId(DEFAULT_VOICE_ID);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { voiceId, isLoaded, setVoice, resetToDefault };
}
