import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { CARTESIA_API_KEY } from '../constants/config';
import { EmotionState, ArousalLevel } from './empathyEngine';
import { DEFAULT_VOICE_ID } from '../constants/voices';

// Single selected voice — same voice for all emotions; tone is modulated via
// emotion controls and speed, not by switching voices.
let selectedVoiceId: string = DEFAULT_VOICE_ID;

export function setSelectedVoiceId(id: string): void {
  selectedVoiceId = id;
}

function getVoiceId(): string {
  return selectedVoiceId;
}

// ── Emotion controls ──────────────────────────────────────────────────────────
// Format: "dimension:level" where level is lowest|low|high|highest
// Dimensions: positivity, negativity, curiosity, surprise, sadness, anger
type EmotionControlKey = `${EmotionState}:${'high' | 'medium' | 'low'}`;

const EMOTION_CONTROLS_MAP: Partial<Record<EmotionControlKey, string[]>> & {
  default: Record<EmotionState, string[]>
} = {
  default: {
    anxious:     ['sadness:low', 'surprise:lowest'],
    overwhelmed: ['sadness:high', 'surprise:lowest'],
    angry:       ['anger:lowest'],
    frustrated:  ['anger:lowest', 'sadness:low'],
    sad:         ['sadness:high'],
    lonely:      ['sadness:low'],
    neutral:     [],
    positive:    ['positivity:high'],
  },
  // Arousal-aware overrides
  'anxious:low':      ['sadness:low'],
  'anxious:medium':   ['sadness:low'],
  'frustrated:medium': ['sadness:lowest'],
  'frustrated:low':   ['sadness:lowest'],
  'angry:medium':     [],
  'angry:low':        [],
};

function getEmotionControls(emotion: EmotionState, arousal: ArousalLevel): string[] {
  const key = `${emotion}:${arousal}` as EmotionControlKey;
  if (key in EMOTION_CONTROLS_MAP) {
    return EMOTION_CONTROLS_MAP[key as keyof typeof EMOTION_CONTROLS_MAP] as string[];
  }
  return EMOTION_CONTROLS_MAP.default[emotion];
}

// ── Speed map ─────────────────────────────────────────────────────────────────
const EMOTION_SPEED_MAP: Record<EmotionState, number> = {
  anxious:     0.88,
  overwhelmed: 0.88,
  angry:       0.90,
  sad:         0.90,
  lonely:      0.90,
  frustrated:  0.92,
  neutral:     1.0,
  positive:    1.0,
};

let currentSound: Audio.Sound | null = null;

export async function stopCurrentPlayback(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Ignore errors on cleanup
    }
    currentSound = null;
  }
}

export async function synthesizeAndPlay(
  text: string,
  emotion: EmotionState,
  arousal: ArousalLevel,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  await stopCurrentPlayback();

  const voiceId  = getVoiceId();
  const speed    = EMOTION_SPEED_MAP[emotion] ?? 1.0;
  const controls = getEmotionControls(emotion, arousal);

  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': CARTESIA_API_KEY,
      'Cartesia-Version': '2024-06-10',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-3',
      transcript: text,
      voice: {
        mode: 'id',
        id: voiceId,
        ...(controls.length > 0 && {
          __experimental_controls: { emotion: controls },
        }),
      },
      output_format: {
        container: 'mp3',
        encoding: 'mp3',
        sample_rate: 44100,
      },
      language: 'en',
      speed,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cartesia TTS API ${response.status}: ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Keep allowsRecordingIOS: true so the always-listening mic stays active.
  // defaultToSpeaker forces iOS to route audio through the main speaker
  // instead of the earpiece (which happens when allowsRecordingIOS is true).
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    ...({ defaultToSpeaker: true } as object),
  } as Parameters<typeof Audio.setAudioModeAsync>[0]);

  const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
  currentSound = sound;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      onEnd?.();
      sound.unloadAsync().catch(() => {});
      currentSound = null;
    }
  });

  onStart?.();
  await sound.playAsync();
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}
