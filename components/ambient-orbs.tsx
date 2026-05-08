import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ORB_A = '#1a2538';
const ORB_B = '#252030';
const ORB_C = '#1a2824';

export function AmbientOrbs() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);
    t1.value = withRepeat(withTiming(1, { duration: 14000, easing }), -1, true);
    t2.value = withRepeat(withTiming(1, { duration: 18000, easing }), -1, true);
    t3.value = withRepeat(withTiming(1, { duration: 16000, easing }), -1, true);
  }, [t1, t2, t3]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -40 + t1.value * 28 },
      { translateY: t1.value * 18 },
      { scale: 1 + t1.value * 0.06 },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: 50 - t2.value * 22 },
      { translateY: -20 + t2.value * 26 },
      { scale: 1.05 + t2.value * 0.05 },
    ],
  }));

  const orb3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -10 + t3.value * 16 },
      { translateY: 30 - t3.value * 22 },
      { scale: 0.95 + t3.value * 0.07 },
    ],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Animated.View style={[styles.orb, styles.orb1, { backgroundColor: `${ORB_A}55` }, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, { backgroundColor: `${ORB_B}4a` }, orb2Style]} />
      <Animated.View style={[styles.orb, styles.orb3, { backgroundColor: `${ORB_C}48` }, orb3Style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.85,
  },
  orb1: {
    width: 320,
    height: 320,
    top: '-8%',
    left: '-18%',
  },
  orb2: {
    width: 280,
    height: 280,
    top: '42%',
    right: '-22%',
  },
  orb3: {
    width: 240,
    height: 240,
    bottom: '6%',
    left: '8%',
  },
});
