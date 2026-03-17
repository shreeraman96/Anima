import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ListeningIndicator } from '../components/ListeningIndicator';
import { useAlwaysListening } from '../hooks/useAlwaysListening';
import { useConversation } from '../hooks/useConversation';
import { useVoiceSettings } from '../hooks/useVoiceSettings';

const EMOTION_COLORS: Record<string, string> = {
  anxious:     '#8B5CF6',
  overwhelmed: '#7C3AED',
  angry:       '#EF4444',
  frustrated:  '#F97316',
  sad:         '#3B82F6',
  lonely:      '#6366F1',
  neutral:     '#64748B',
  positive:    '#10B981',
};

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  // Load voice settings and sync overrides on mount
  useVoiceSettings();

  const {
    messages,
    state: convState,
    currentEmotion,
    error,
    processAudio,
    clearConversation,
    interruptResponse,
  } = useConversation();

  const isResponding = convState === 'responding';

  const { state: listenState, isSpeechDetected, isMuted, toggleMute } =
    useAlwaysListening(processAudio, isResponding);

  // Auto-interrupt TTS when user starts speaking
  useEffect(() => {
    if (isSpeechDetected && isResponding) {
      interruptResponse();
    }
  }, [isSpeechDetected, isResponding, interruptResponse]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Surface errors
  useEffect(() => {
    if (error) Alert.alert('Something went wrong', error);
  }, [error]);

  const isProcessing = convState === 'transcribing' || convState === 'thinking';

  const indicatorState = (() => {
    if (isProcessing || isResponding) return 'processing' as const;
    return listenState;
  })();

  const emotionColor = currentEmotion?.emotion
    ? EMOTION_COLORS[currentEmotion.emotion]
    : undefined;

  const getModeChip = () => {
    if (!currentEmotion) return null;
    if (currentEmotion.mode === 'TRANSACTIONAL') {
      return { label: 'task mode', color: '#475569' };
    }
    return {
      label: `${currentEmotion.emotion} · ${currentEmotion.arousal}`,
      color: EMOTION_COLORS[currentEmotion.emotion] ?? '#64748B',
    };
  };

  const chip = getModeChip();

  // Mic button label & color based on current state
  const micState = (() => {
    if (isMuted)       return { label: 'paused',    color: '#EF4444' };
    if (isProcessing)  return { label: 'thinking',  color: '#8B5CF6' };
    if (isResponding)  return { label: 'speaking',  color: emotionColor ?? '#64748B' };
    if (isSpeechDetected) return { label: 'heard',  color: '#10B981' };
    return { label: 'listening', color: '#334155' };
  })();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.appName}>empath</Text>
        <View style={styles.headerRight}>
          <ListeningIndicator
            listeningState={indicatorState}
            emotionColor={emotionColor}
            isMuted={isMuted}
          />
          {chip && (
            <View style={[styles.modeChip, { borderColor: chip.color + '50' }]}>
              <View style={[styles.modeDot, { backgroundColor: chip.color }]} />
              <Text style={[styles.modeChipText, { color: chip.color }]}>{chip.label}</Text>
            </View>
          )}
          {messages.length > 0 && (
            <Pressable onPress={clearConversation} style={styles.clearBtn}>
              <Text style={styles.clearText}>clear</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/settings')} style={styles.gearBtn}>
            <Text style={styles.gearIcon}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Conversation log ───────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageListContent,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your private space.</Text>
            <Text style={styles.emptySubtitle}>Just start talking.</Text>
            <Text style={styles.emptyHint}>Nothing leaves this device.</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const eColor = msg.empathy?.emotion
              ? EMOTION_COLORS[msg.empathy.emotion]
              : undefined;
            const isUser = msg.role === 'user';

            return (
              <View
                key={msg.id}
                style={isUser ? styles.userBubble : styles.assistantBubble}
              >
                {!isUser && eColor && (
                  <View style={[styles.emotionBar, { backgroundColor: eColor }]} />
                )}
                <View style={isUser ? styles.userBubbleInner : styles.assistantBubbleInner}>
                  <Text style={isUser ? styles.userText : styles.assistantText}>
                    {msg.content}
                  </Text>
                  {msg.empathy?.mode === 'EMPATHETIC' && (
                    <Text style={styles.bubbleMeta}>
                      {msg.empathy.emotion} · {msg.empathy.hapticPattern.toLowerCase().replace('_', ' ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Thinking dots */}
        {isProcessing && (
          <View style={styles.thinkingRow}>
            <View style={[styles.thinkingDot, styles.thinkingDot1]} />
            <View style={[styles.thinkingDot, styles.thinkingDot2]} />
            <View style={[styles.thinkingDot, styles.thinkingDot3]} />
          </View>
        )}
      </ScrollView>

      {/* ── Mic control bar ────────────────────────────────────────────── */}
      <View style={styles.micBar}>
        <Pressable
          onPress={toggleMute}
          style={[styles.micBtn, { borderColor: micState.color + '60' }]}
        >
          {/* Mic icon — simple rectangle + stand */}
          <View style={styles.micIconWrap}>
            <View style={[styles.micCapsule, { backgroundColor: isMuted ? '#EF4444' : micState.color }]} />
            <View style={[styles.micStand, { borderColor: isMuted ? '#EF4444' : micState.color }]} />
            <View style={[styles.micBase, { backgroundColor: isMuted ? '#EF4444' : micState.color }]} />
          </View>
          <Text style={[styles.micLabel, { color: micState.color }]}>{micState.label}</Text>
        </Pressable>
      </View>
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
  appName: {
    fontSize: 20,
    fontWeight: '200',
    color: '#E2E8F0',
    letterSpacing: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  modeChipText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 11,
    color: '#475569',
    letterSpacing: 1,
  },
  gearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  gearIcon: {
    fontSize: 14,
    color: '#475569',
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    // alignItems: flex-start prevents bubbles from stretching to full width
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#334155',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#1E293B',
    marginTop: 8,
    fontWeight: '300',
  },
  emptyHint: {
    fontSize: 10,
    color: '#1E293B',
    marginTop: 24,
    letterSpacing: 2,
  },

  // Bubbles — separated user/assistant so no shared flex: 1 confusion
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    marginVertical: 4,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  userBubbleInner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    marginVertical: 4,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: '#0F172A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E293B',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  assistantBubbleInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emotionBar: {
    width: 3,
    opacity: 0.7,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#CBD5E1',
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#94A3B8',
    fontWeight: '300',
  },
  bubbleMeta: {
    fontSize: 9,
    color: '#334155',
    letterSpacing: 0.6,
    marginTop: 4,
  },

  // Thinking dots
  thinkingRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 5,
    paddingLeft: 4,
    paddingVertical: 12,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  thinkingDot1: { opacity: 0.4 },
  thinkingDot2: { opacity: 0.65 },
  thinkingDot3: { opacity: 0.9 },

  // Mic bar
  micBar: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
  },
  micBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 40,
    borderWidth: 1,
    backgroundColor: '#0D1520',
  },
  micIconWrap: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'flex-end',
  },
  micCapsule: {
    width: 10,
    height: 16,
    borderRadius: 5,
    marginBottom: 2,
  },
  micStand: {
    width: 18,
    height: 8,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    borderWidth: 1.5,
    borderTopWidth: 0,
    marginBottom: 1,
  },
  micBase: {
    width: 10,
    height: 1.5,
    borderRadius: 1,
  },
  micLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '400',
  },
});
