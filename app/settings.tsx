import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { CARTESIA_API_KEY } from '../constants/config';
import { arrayBufferToBase64 } from '../services/ttsService';
import { CURATED_VOICES, CuratedVoice } from '../constants/voices';
import { useVoiceSettings } from '../hooks/useVoiceSettings';

const PREVIEW_TEXT = "I'm here with you. Tell me more about what you're feeling.";

let previewSound: Audio.Sound | null = null;

async function stopPreview(): Promise<void> {
  if (previewSound) {
    try {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
    } catch {}
    previewSound = null;
  }
}

async function playPreview(voiceId: string): Promise<void> {
  await stopPreview();

  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': CARTESIA_API_KEY,
      'Cartesia-Version': '2024-06-10',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-3',
      transcript: PREVIEW_TEXT,
      voice: { mode: 'id', id: voiceId },
      output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100 },
      language: 'en',
      speed: 1.0,
    }),
  });

  if (!response.ok) throw new Error(`Preview TTS ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${FileSystem.cacheDirectory}preview_${Date.now()}.mp3`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    ...({ defaultToSpeaker: true } as object),
  } as Parameters<typeof Audio.setAudioModeAsync>[0]);

  const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
  previewSound = sound;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
      previewSound = null;
    }
  });

  await sound.playAsync();
}

function VoiceRow({
  voice,
  isSelected,
  onSelect,
}: {
  voice: CuratedVoice;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handlePreview = useCallback(async () => {
    setIsPreviewing(true);
    try {
      await playPreview(voice.id);
    } catch (err) {
      console.error('[EmpathAI] Preview error:', err);
    }
    setIsPreviewing(false);
  }, [voice.id]);

  const genderDot = voice.gender === 'female' ? '♀' : '♂';

  return (
    <Pressable onPress={onSelect} style={[styles.voiceRow, isSelected && styles.voiceRowSelected]}>
      <View style={styles.voiceInfo}>
        <View style={styles.voiceNameRow}>
          <Text style={styles.voiceName}>{voice.name}</Text>
          <Text style={[styles.genderDot, voice.gender === 'female' ? styles.genderFemale : styles.genderMale]}>
            {genderDot}
          </Text>
        </View>
        <Text style={styles.voiceDesc}>{voice.description}</Text>
      </View>

      <View style={styles.voiceActions}>
        <Pressable onPress={handlePreview} style={styles.previewBtn} disabled={isPreviewing}>
          {isPreviewing ? (
            <ActivityIndicator size="small" color="#64748B" />
          ) : (
            <Text style={styles.previewIcon}>▶</Text>
          )}
        </Pressable>

        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { voiceId, isLoaded, setVoice, resetToDefault } = useVoiceSettings();

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#64748B" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { stopPreview(); router.back(); }} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>companion voice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Your companion uses this voice for all responses. Tone and pace adapt automatically to the emotional context.
        </Text>

        {CURATED_VOICES.map((voice) => (
          <VoiceRow
            key={voice.id}
            voice={voice}
            isSelected={voice.id === voiceId}
            onSelect={() => setVoice(voice.id)}
          />
        ))}

        <Pressable onPress={resetToDefault} style={styles.resetBtn}>
          <Text style={styles.resetText}>reset to default</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#94A3B8',
  },
  title: {
    fontSize: 16,
    fontWeight: '200',
    color: '#E2E8F0',
    letterSpacing: 3,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  subtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    letterSpacing: 0.3,
    marginBottom: 20,
  },

  // Voice rows
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E293B',
  },
  voiceRowSelected: {
    borderColor: '#4C1D95',
    backgroundColor: '#0D0D1A',
  },
  voiceInfo: {
    flex: 1,
    marginRight: 12,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#E2E8F0',
  },
  genderDot: {
    fontSize: 11,
  },
  genderFemale: {
    color: '#A78BFA',
  },
  genderMale: {
    color: '#60A5FA',
  },
  voiceDesc: {
    fontSize: 11,
    color: '#475569',
    letterSpacing: 0.3,
  },

  // Actions
  voiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIcon: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Radio
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#8B5CF6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },

  // Reset
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  resetText: {
    fontSize: 12,
    color: '#475569',
    letterSpacing: 1,
  },
});
