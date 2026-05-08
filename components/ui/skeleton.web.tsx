import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
};

/** Diagonal shimmer without native-only deps (avoids requireNativeComponent on web). */
export function Skeleton({ style }: SkeletonProps) {
  const progress = useSharedValue(0);
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const borderRadius = typeof flat?.borderRadius === 'number' ? flat.borderRadius : 12;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1350, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-140, 220]) },
      { translateY: interpolate(progress.value, [0, 1], [-90, 130]) },
      { rotate: '-28deg' },
    ],
  }));

  return (
    <View style={[styles.webBone, flat, { overflow: 'hidden', borderRadius }]}>
      <Animated.View style={[styles.webShimmer, shimmerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  webBone: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  webShimmer: {
    position: 'absolute',
    width: 140,
    height: '300%',
    top: '-100%',
    left: '30%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    opacity: 0.85,
  },
});
