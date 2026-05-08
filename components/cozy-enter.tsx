import { type ReactNode } from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

type Props = { children: ReactNode; delay?: number };

export function CozyEnter({ children, delay = 0 }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay)
        .duration(520)
        .springify()
        .damping(16)
        .stiffness(118)}>
      <Animated.View entering={FadeIn.delay(delay + 40).duration(360)}>{children}</Animated.View>
    </Animated.View>
  );
}
