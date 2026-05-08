import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/context/AppThemeContext';
import { hapticSelection } from '@/utils/haptics';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PressableScale({ children, style, onPressIn, onPressOut, ...rest }: Props) {
  const { reduceMotion } = useAppTheme();
  const scale = useSharedValue(1);
  const hoverScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * hoverScale.value }],
  }));

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 420 });
        void hapticSelection();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 300 });
        onPressOut?.(e);
      }}
      onHoverIn={() => {
        if (reduceMotion) return;
        hoverScale.value = withSpring(1.01, { damping: 18, stiffness: 280 });
      }}
      onHoverOut={() => {
        hoverScale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}>
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
