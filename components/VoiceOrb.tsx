import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { VisualState } from '../services/empathyEngine';

interface OrbColors {
  outer: string;
  middle: string;
  inner: string;
}

const STATE_COLORS: Record<string, OrbColors> = {
  TURBULENT: { outer: '#EF4444', middle: '#F97316', inner: '#FCA5A5' },
  RIPPLE:    { outer: '#8B5CF6', middle: '#A78BFA', inner: '#C4B5FD' },
  CALM:      { outer: '#06B6D4', middle: '#22D3EE', inner: '#A5F3FC' },
  WARM_GLOW: { outer: '#F59E0B', middle: '#FBBF24', inner: '#FDE68A' },
  NEUTRAL:   { outer: '#475569', middle: '#64748B', inner: '#94A3B8' },
  RECORDING: { outer: '#EF4444', middle: '#F87171', inner: '#FEE2E2' },
  PROCESSING:{ outer: '#8B5CF6', middle: '#A78BFA', inner: '#DDD6FE' },
};

interface Props {
  visualState: VisualState;
  isRecording: boolean;
  isProcessing: boolean;
}

export function VoiceOrb({ visualState, isRecording, isProcessing }: Props) {
  const outerScale  = useSharedValue(1);
  const outerOpacity = useSharedValue(0.35);
  const middleScale = useSharedValue(1);
  const innerScale  = useSharedValue(1);
  const innerOpacity = useSharedValue(0.9);

  useEffect(() => {
    // Cancel all before re-animating
    cancelAnimation(outerScale);
    cancelAnimation(outerOpacity);
    cancelAnimation(middleScale);
    cancelAnimation(innerScale);
    cancelAnimation(innerOpacity);

    if (isRecording) {
      // Fast reactive pulse while listening
      outerScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 260, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 260, easing: Easing.in(Easing.ease) })
        ), -1, false
      );
      outerOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 260 }), withTiming(0.25, { duration: 260 })),
        -1, false
      );
      innerScale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 300 }), withTiming(0.96, { duration: 300 })),
        -1, false
      );
      return;
    }

    if (isProcessing) {
      // Slow rotating breath — "thinking"
      middleScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ), -1, false
      );
      outerOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 900 }), withTiming(0.2, { duration: 900 })),
        -1, false
      );
      return;
    }

    // Idle visual state animations
    switch (visualState) {
      case 'TURBULENT':
        // Anxious / high arousal: fast, jittery
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.14, { duration: 180 }),
            withTiming(0.94, { duration: 140 }),
            withTiming(1.10, { duration: 160 }),
            withTiming(1.0,  { duration: 140 })
          ), -1, false
        );
        innerScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 200 }),
            withTiming(0.96, { duration: 180 })
          ), -1, false
        );
        outerOpacity.value = withRepeat(
          withSequence(withTiming(0.55, { duration: 140 }), withTiming(0.2, { duration: 140 })),
          -1, false
        );
        break;

      case 'RIPPLE':
        // Processing / transitioning: medium, flowing
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 900, easing: Easing.out(Easing.sin) }),
            withTiming(0.98, { duration: 900, easing: Easing.in(Easing.sin) })
          ), -1, false
        );
        middleScale.value = withRepeat(
          withSequence(
            withTiming(1.14, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.93, { duration: 1200, easing: Easing.inOut(Easing.sin) })
          ), -1, false
        );
        outerOpacity.value = withRepeat(
          withSequence(withTiming(0.45, { duration: 900 }), withTiming(0.2, { duration: 900 })),
          -1, false
        );
        break;

      case 'CALM':
        // Low arousal / peaceful: very slow breathing
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.97, { duration: 3000, easing: Easing.inOut(Easing.sin) })
          ), -1, false
        );
        innerOpacity.value = withRepeat(
          withSequence(withTiming(1, { duration: 3000 }), withTiming(0.7, { duration: 3000 })),
          -1, false
        );
        outerOpacity.value = withRepeat(
          withSequence(withTiming(0.4, { duration: 3000 }), withTiming(0.18, { duration: 3000 })),
          -1, false
        );
        break;

      case 'WARM_GLOW':
        // Positive / connected: warm slow pulse
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0,  { duration: 1800, easing: Easing.inOut(Easing.ease) })
          ), -1, false
        );
        outerOpacity.value = withRepeat(
          withSequence(withTiming(0.5, { duration: 1800 }), withTiming(0.25, { duration: 1800 })),
          -1, false
        );
        innerOpacity.value = withRepeat(
          withSequence(withTiming(1, { duration: 1800 }), withTiming(0.75, { duration: 1800 })),
          -1, false
        );
        break;

      case 'NEUTRAL':
      default:
        // Minimal ambient idle
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.03, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.99, { duration: 3500, easing: Easing.inOut(Easing.sin) })
          ), -1, false
        );
        outerOpacity.value = withTiming(0.22, { duration: 800 });
        innerOpacity.value = withTiming(0.7, { duration: 800 });
        break;
    }
  }, [visualState, isRecording, isProcessing]);

  const getColors = (): OrbColors => {
    if (isRecording)  return STATE_COLORS.RECORDING;
    if (isProcessing) return STATE_COLORS.PROCESSING;
    return STATE_COLORS[visualState] ?? STATE_COLORS.NEUTRAL;
  };

  const colors = getColors();

  const outerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: outerOpacity.value,
  }));

  const middleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: middleScale.value }],
  }));

  const innerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
    opacity: innerOpacity.value,
  }));

  return (
    <View style={styles.orbWrapper}>
      {/* Outer glow ring */}
      <Animated.View
        style={[styles.outerRing, { backgroundColor: colors.outer + '28' }, outerAnimStyle]}
      />
      {/* Middle layer */}
      <Animated.View
        style={[styles.middleRing, { backgroundColor: colors.middle + '45' }, middleAnimStyle]}
      >
        {/* Inner core */}
        <Animated.View
          style={[styles.innerCore, { backgroundColor: colors.inner }, innerAnimStyle]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  orbWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  middleRing: {
    width: 156,
    height: 156,
    borderRadius: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
});
