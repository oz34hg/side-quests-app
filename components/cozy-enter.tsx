import { type ReactNode } from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useAppTheme } from '@/context/AppThemeContext';

type Props = { children: ReactNode; delay?: number };

export function CozyEnter({ children, delay = 0 }: Props) {
  const { reduceMotion } = useAppTheme();
  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.delay(delay)
              .duration(520)
              .springify()
              .damping(16)
              .stiffness(118)
      }>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(delay + 40).duration(360)}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}
