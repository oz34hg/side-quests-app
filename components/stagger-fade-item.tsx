import { type ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Props = { index: number; children: ReactNode };

export function StaggerFadeItem({ index, children }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 14) * 55)
        .duration(420)
        .springify()
        .damping(16)
        .stiffness(140)}>
      {children}
    </Animated.View>
  );
}
