# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install          # Install dependencies
cp .env.example .env # Create env file, then add API keys
npm start            # Start Expo dev server (scan QR with Expo Go on iPhone)
npm run ios          # Start with iOS simulator
npm run android      # Start with Android emulator
```

No test runner or linter is configured.

## Environment Setup

Requires two API keys in `.env`:
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

## Architecture

EmpathAI is an Expo/React Native iOS voice companion that routes between two behavioral modes based on emotional context detected by Claude.

### Core Pipeline

```
[Hold button] → expo-av records audio (.m4a)
    ↓
useVoiceRecorder hook → URI
    ↓
useConversation hook orchestrates:
    1. transcription.ts  → OpenAI Whisper → text
    2. empathyEngine.ts  → Claude Opus 4.5 → EmpathyResponse JSON
    3. hapticService.ts  → device haptics (starts immediately)
    4. ttsService.ts     → OpenAI TTS → audio playback
    5. VoiceOrb.tsx      → animated visual state
```

### Dual Modes

**TRANSACTIONAL** — for facts/tasks: short response, no haptics, neutral orb.

**EMPATHETIC** — for stress/emotion: ≤60 word spoken response, haptic pattern matched to emotion, animated orb state, one follow-up question.

### Key Files

- [services/empathyEngine.ts](services/empathyEngine.ts) — Claude Opus 4.5 integration; emits structured JSON with `mode`, `emotion`, `arousal`, `hapticPattern`, `visualState`, `response`
- [services/ttsService.ts](services/ttsService.ts) — OpenAI TTS; maps emotion → voice (`nova`/`alloy`/`shimmer`) and adjusts speed for distress states
- [services/hapticService.ts](services/hapticService.ts) — Runs timed haptic loops: HEARTBEAT_CALM, HEARTBEAT_FAST, BREATH_DEEP, PULSE_GENTLE
- [services/transcription.ts](services/transcription.ts) — OpenAI Whisper call
- [hooks/useConversation.ts](hooks/useConversation.ts) — Orchestrates the full pipeline; keeps last 10 messages for Claude context
- [hooks/useVoiceRecorder.ts](hooks/useVoiceRecorder.ts) — Audio recording state machine (`idle → recording → processing`)
- [components/VoiceOrb.tsx](components/VoiceOrb.tsx) — Reanimated v3 orb with visual states: TURBULENT, RIPPLE, CALM, WARM_GLOW, NEUTRAL, RECORDING, PROCESSING
- [app/index.tsx](app/index.tsx) — Main screen; drives UI from combined hook state
- [constants/config.ts](constants/config.ts) — Loads API keys from `EXPO_PUBLIC_*` env vars

### Haptic ↔ Emotion Mappings (defined in empathyEngine system prompt)

| Emotion | Arousal | Haptic Pattern | Visual State |
|---------|---------|----------------|--------------|
| anxiety | high | HEARTBEAT_CALM | TURBULENT |
| overwhelm | any | HEARTBEAT_CALM | TURBULENT |
| anger | high | BREATH_DEEP | RIPPLE |
| sad/lonely | any | PULSE_GENTLE | CALM |
| positive | any | PULSE_GENTLE | WARM_GLOW |
| neutral/transactional | — | NONE | NEUTRAL |
