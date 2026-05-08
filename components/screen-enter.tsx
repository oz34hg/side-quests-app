import { type ReactNode } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/context/AppThemeContext';

type Props = { children: ReactNode; delay?: number };

/** Soft fade-in for tab / screen roots. */
export function ScreenEnter({ children, delay = 0 }: Props) {
  const { reduceMotion } = useAppTheme();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(delay).duration(420)} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}
