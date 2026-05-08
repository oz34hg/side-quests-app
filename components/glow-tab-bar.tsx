import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/context/AppThemeContext';

export function GlowTabBar(props: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 72 + insets.bottom;
  const flatTabBarStyle = StyleSheet.flatten(props.tabBarStyle) ?? {};
  const resolvedBarHeight =
    typeof flatTabBarStyle.height === 'number' ? flatTabBarStyle.height : tabBarHeight + 4;
  const {
    position: _p,
    left: _l,
    right: _r,
    bottom: _b,
    top: _t,
    ...tabBarInnerStyle
  } = flatTabBarStyle as Record<string, unknown>;
  const [innerWidth, setInnerWidth] = useState(0);
  const dotX = useSharedValue(0);
  const routesLen = props.state.routes.length;
  const activeIndex = props.state.index;

  useEffect(() => {
    if (innerWidth <= 0 || routesLen <= 0) return;
    const segment = innerWidth / routesLen;
    const target = segment * activeIndex + segment / 2 - 4;
    dotX.value = withSpring(target, { damping: 17, stiffness: 280 });
  }, [activeIndex, dotX, innerWidth, routesLen]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotX.value }],
    opacity: innerWidth > 0 ? 1 : 0,
  }));

  const onBarLayout = (e: LayoutChangeEvent) => {
    setInnerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.outer,
        {
          height: resolvedBarHeight,
        },
      ]}>
      <BlurView
        tint="dark"
        intensity={50}
        style={[
          styles.blur,
          {
            borderColor: `${theme.border}AA`,
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(20px) saturate(1.25)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.25)',
                } as object)
              : null),
          },
        ]}>
        <View style={styles.barInner} onLayout={onBarLayout}>
          <BottomTabBar
            {...props}
            tabBarStyle={tabBarInnerStyle}
            style={[
              props.style,
              {
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
                flex: 1,
              },
            ]}
          />
          <View style={styles.dotTrack} pointerEvents="none">
            <Animated.View style={[styles.dotGlow, { backgroundColor: theme.primary }, dotStyle]} />
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
  },
  blur: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(28,28,30,0.72)',
  },
  barInner: {
    flex: 1,
    position: 'relative',
  },
  dotTrack: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  dotGlow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.65,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
