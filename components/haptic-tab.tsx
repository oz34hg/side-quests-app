import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1, justifyContent: 'center' }, animStyle]}>
      <PlatformPressable
        {...props}
        onPressIn={(ev) => {
          scale.value = withSpring(0.92, { damping: 14, stiffness: 380 });
          lift.value = withTiming(-2, { duration: 90 });
          if (process.env.EXPO_OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
        onPressOut={(ev) => {
          scale.value = withSpring(1, { damping: 13, stiffness: 220 });
          lift.value = withTiming(0, { duration: 140 });
          props.onPressOut?.(ev);
        }}
      />
    </Animated.View>
  );
}
