import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ListeningState } from '../hooks/useAlwaysListening';

interface Props {
  listeningState: ListeningState;
  emotionColor?: string;
  isMuted: boolean;
}

export function ListeningIndicator({ listeningState, emotionColor, isMuted }: Props) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    if (isMuted) {
      scale.value   = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.15, { duration: 300 });
      return;
    }

    switch (listeningState) {
      case 'listening':
        // Slow, subtle slate pulse — "I'm here"
        scale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.0,  { duration: 1800, easing: Easing.inOut(Easing.sin) })
          ), -1, false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 1800 }),
            withTiming(0.25, { duration: 1800 })
          ), -1, false
        );
        break;

      case 'speech_detected':
        // Fast bright pulse — "I hear you"
        scale.value = withRepeat(
          withSequence(
            withTiming(1.4, { duration: 300, easing: Easing.out(Easing.ease) }),
            withTiming(1.1, { duration: 300, easing: Easing.in(Easing.ease) })
          ), -1, false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.6, { duration: 300 })
          ), -1, false
        );
        break;

      case 'processing':
        // Gentle breathing — "thinking"
        scale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 700, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.sin) })
          ), -1, false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.9, { duration: 700 }),
            withTiming(0.4, { duration: 700 })
          ), -1, false
        );
        break;

      case 'initializing':
      default:
        scale.value   = withTiming(1, { duration: 400 });
        opacity.value = withTiming(0.2, { duration: 400 });
        break;
    }
  }, [listeningState, isMuted]);

  const getColor = (): string => {
    if (isMuted) return '#334155';
    switch (listeningState) {
      case 'speech_detected': return '#10B981';
      case 'processing':      return '#8B5CF6';
      case 'listening':       return emotionColor ?? '#64748B';
      default:                return '#334155';
    }
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: getColor(),
        },
        animStyle,
      ]}
    />
  );
}
