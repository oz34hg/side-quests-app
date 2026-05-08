import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { BENTO_SQUIRCLE_RADIUS } from '@/constants/bento';
import { useAppTheme } from '@/context/AppThemeContext';

type Props = {
  children: ReactNode;
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Fill one column in a 2-col row, or full width */
  span?: 'full' | 'half';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function BentoCard({ children, icon, span = 'full', style, onPress }: Props) {
  const { theme } = useAppTheme();

  const webGlow =
    Platform.OS === 'web'
      ? ({
          boxShadow: `0 24px 52px rgba(0,0,0,0.4), 0 10px 28px ${theme.primary}28, 0 2px 12px rgba(0,0,0,0.35)`,
        } as ViewStyle)
      : null;

  const face = (
    <>
      <View style={[styles.iconTint, { backgroundColor: `${theme.primary}24` }]}>
        <MaterialIcons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.cardBody}>{children}</View>
    </>
  );

  const shell = (
    <View
      style={[
        styles.shadowLift,
        {
          shadowColor: theme.primary,
          borderRadius: BENTO_SQUIRCLE_RADIUS,
        },
        webGlow,
      ]}>
      <View
        style={[
          styles.shadowContact,
          {
            shadowColor: '#000',
            borderRadius: BENTO_SQUIRCLE_RADIUS,
          },
        ]}>
        <View
          style={[
            styles.cardFace,
            {
              borderRadius: BENTO_SQUIRCLE_RADIUS,
              backgroundColor: `${theme.card}F5`,
              borderColor: 'rgba(255,255,255,0.05)',
            },
          ]}>
          {face}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[span === 'half' ? styles.spanHalf : styles.spanFull, style]}>
      {onPress ? (
        <PressableScale style={styles.pressFill} onPress={onPress}>
          {shell}
        </PressableScale>
      ) : (
        shell
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  spanFull: {
    width: '100%',
  },
  spanHalf: {
    flex: 1,
    minWidth: 0,
  },
  pressFill: { alignSelf: 'stretch', width: '100%' },
  shadowLift: {
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  shadowContact: {
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  cardFace: {
    overflow: 'hidden',
    borderWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  iconTint: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardBody: {
    paddingRight: 44,
    gap: 6,
  },
});
