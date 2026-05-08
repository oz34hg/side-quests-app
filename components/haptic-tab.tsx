import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/context/AppThemeContext';
import { hapticSelection } from '@/utils/haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { reduceMotion } = useAppTheme();
  const scale = useSharedValue(1);
  const hoverScale = useSharedValue(1);
  const lift = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * hoverScale.value }, { translateY: lift.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1, justifyContent: 'center' }, animStyle]}>
      <PlatformPressable
        {...props}
        onPressIn={(ev) => {
          scale.value = withSpring(0.97, { damping: 14, stiffness: 380 });
          lift.value = withSpring(reduceMotion ? -1 : -2, { damping: 18, stiffness: 360 });
          void hapticSelection();
          props.onPressIn?.(ev);
        }}
        onPressOut={(ev) => {
          scale.value = withSpring(1, { damping: 13, stiffness: 220 });
          lift.value = withSpring(0, { damping: 16, stiffness: 260 });
          props.onPressOut?.(ev);
        }}
        onHoverIn={(ev) => {
          if (!reduceMotion) hoverScale.value = withSpring(1.06, { damping: 20, stiffness: 240 });
          props.onHoverIn?.(ev);
        }}
        onHoverOut={(ev) => {
          hoverScale.value = withSpring(1, { damping: 15, stiffness: 240 });
          props.onHoverOut?.(ev);
        }}
      />
    </Animated.View>
  );
}
