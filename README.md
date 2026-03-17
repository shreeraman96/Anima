# Anima

> **⚠️ EARLY DEVELOPMENT — NOT FOR PUBLIC USE**
>
> Anima is an experimental prototype in active development. It is **not** a mental health tool, therapist, or crisis service. It should **not** be relied upon for emotional support, medical advice, or any form of clinical guidance.
>
> **Do not use this product if you are in distress or experiencing a mental health crisis.** If you need help, please contact a qualified professional or call a crisis hotline (e.g. 988 Suicide & Crisis Lifeline in the US).
>
> The repository owner assumes no responsibility for any unintended, harmful, or adverse outcomes resulting from the use of this software. By using or running this code, you acknowledge that it is an incomplete prototype with no guarantees of accuracy, safety, or reliability.

An always-listening AI voice companion built with Expo/React Native. Anima detects emotional context in real-time and responds with adaptive voice, haptics, and visuals — all processed on-device for complete privacy.

## How It Works

```
Always-listening mic (expo-av metering)
    ↓ speech detected → silence → utterance captured
OpenAI Whisper (transcription)
    ↓
Claude Sonnet 4.6 (empathy engine — routes TRANSACTIONAL vs EMPATHETIC)
    ↓              ↓              ↓
Cartesia TTS    Haptics       Animated UI
(emotion-      (heartbeat,    (emotion chip,
 adaptive       breathing,     color-coded
 voice)         pulse)         bubbles)
```

## Features

- **Always-listening**: Hands-free voice interaction with automatic speech detection and silence-based utterance segmentation
- **Dual-mode routing**: Claude classifies intent as TRANSACTIONAL (crisp, direct) or EMPATHETIC (full affective suite)
- **Emotion-adaptive TTS**: Single companion voice via Cartesia Sonic-3 with per-emotion speed modulation and expressive controls (sadness, positivity, anger, etc.)
- **Voice selection**: 12 curated voices (6 female, 6 male) with live preview
- **Haptic patterns**: Mapped to emotional state — HEARTBEAT_CALM, BREATH_DEEP, PULSE_GENTLE
- **Arousal detection**: Three-level intensity (low/medium/high) that affects voice pace, haptic intensity, and visual state
- **Privacy-first**: No data leaves the device beyond API calls; no accounts, no telemetry

## Prerequisites

- Node.js 18+
- Expo Go app on your iPhone (App Store)
- API keys: [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [Cartesia](https://play.cartesia.ai)

## Setup

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# Fill in your API keys in .env

# Start the dev server
npx expo start

# Scan the QR code with your iPhone camera → opens in Expo Go
```

## Environment Variables

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...      # Whisper transcription
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-... # Claude empathy engine
EXPO_PUBLIC_CARTESIA_API_KEY=sk_car_...  # Cartesia TTS
```

## Project Structure

```
app/
  index.tsx          — Main screen: always-listening UI, conversation log
  settings.tsx       — Voice selection with live preview
  _layout.tsx        — Expo Router stack config

services/
  empathyEngine.ts   — Claude integration: emotion classification + response
  ttsService.ts      — Cartesia TTS: emotion controls, speed modulation
  transcription.ts   — OpenAI Whisper
  hapticService.ts   — Timed haptic loops (heartbeat, breathing, pulse)

hooks/
  useAlwaysListening.ts — Continuous mic monitoring with speech/silence detection
  useConversation.ts    — Orchestrates transcription → Claude → TTS pipeline
  useVoiceSettings.ts   — Voice selection persistence (AsyncStorage)
  useVoiceRecorder.ts   — Manual recording state machine

components/
  ListeningIndicator.tsx — Animated listening/processing/muted indicator

constants/
  config.ts           — API key loader from env vars
  voices.ts           — Curated voice catalog (12 Cartesia voices)
```

## Emotion → Behavior Mapping

| Emotion | Arousal | Haptic | Voice Speed |
|---------|---------|--------|-------------|
| anxious | high | HEARTBEAT_CALM | 0.88x |
| overwhelmed | any | HEARTBEAT_CALM | 0.88x |
| angry | high | BREATH_DEEP | 0.90x |
| sad | any | PULSE_GENTLE | 0.90x |
| lonely | any | PULSE_GENTLE | 0.90x |
| frustrated | high | HEARTBEAT_FAST | 0.92x |
| positive | any | PULSE_GENTLE | 1.0x |
| neutral | — | NONE | 1.0x |

## Disclaimer

This software is provided "as is", without warranty of any kind. Anima is a technical prototype exploring emotion-aware AI interaction patterns. It is not a substitute for professional mental health care, therapy, or counseling. The developers and repository owner are not liable for any damages, emotional or otherwise, arising from the use of this software. This product is not yet advisable for use in any capacity and is shared purely for development and demonstration purposes.
