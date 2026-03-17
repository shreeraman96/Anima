import * as Haptics from 'expo-haptics';
import { HapticPattern } from './empathyEngine';

let activeIntervals: ReturnType<typeof setInterval>[] = [];
let activeTimeouts: ReturnType<typeof setTimeout>[] = [];

export function stopHapticPattern(): void {
  activeIntervals.forEach(clearInterval);
  activeTimeouts.forEach(clearTimeout);
  activeIntervals = [];
  activeTimeouts = [];
}

export function startHapticPattern(pattern: HapticPattern): void {
  stopHapticPattern();
  if (pattern === 'NONE') return;

  switch (pattern) {
    case 'HEARTBEAT_CALM':
      // Resting heart: ~55bpm = 1090ms, double-tap (lub-dub)
      startHeartbeat(1090, Haptics.ImpactFeedbackStyle.Light);
      break;

    case 'HEARTBEAT_FAST':
      // Slightly elevated: ~80bpm = 750ms — matches anxiety, then caller should slow
      startHeartbeat(750, Haptics.ImpactFeedbackStyle.Medium);
      break;

    case 'BREATH_DEEP':
      // 5-second breath cycle: swell in → hold → release
      // Inspired by Sentic Forms — timed tension and release
      startBreathCycle();
      break;

    case 'PULSE_GENTLE':
      // 2-second presence pulse — "I'm here"
      startGentlePulse();
      break;
  }
}

function startHeartbeat(
  intervalMs: number,
  style: Haptics.ImpactFeedbackStyle
): void {
  const beat = () => {
    Haptics.impactAsync(style);
    const t = setTimeout(() => Haptics.impactAsync(style), 130);
    activeTimeouts.push(t);
  };

  beat(); // Immediate
  const interval = setInterval(beat, intervalMs);
  activeIntervals.push(interval);
}

function startBreathCycle(): void {
  // 5-second cycle: inhale (2.5s) → exhale (2.5s)
  // Sentic principle: timing of tension/release IS the emotion
  const cycle = () => {
    // Inhale swell — 3 ascending taps
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const t1 = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      700
    );
    const t2 = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      1400
    );

    // Brief hold at top (2s mark) — no haptic, felt as suspension

    // Exhale release — 2 descending taps
    const t3 = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      2800
    );
    const t4 = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      3600
    );

    activeTimeouts.push(t1, t2, t3, t4);
  };

  cycle();
  const interval = setInterval(cycle, 5000);
  activeIntervals.push(interval);
}

function startGentlePulse(): void {
  // Soft double-tap every 2 seconds — "presence"
  const pulse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      100
    );
    activeTimeouts.push(t);
  };

  pulse();
  const interval = setInterval(pulse, 2000);
  activeIntervals.push(interval);
}
