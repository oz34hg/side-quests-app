import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Radius, Space, Typography } from '@/constants/design';
import { useAppTheme } from '@/context/AppThemeContext';

type EmptyStateProps = {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  ctaLabel,
  onPressCta,
}: EmptyStateProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: `${theme.card}E6`, borderColor: `${theme.border}99` }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}18` }]}>
        <MaterialIcons name={icon} size={24} color={`${theme.primary}CC`} />
      </View>
      <Text allowFontScaling={false} style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: `${theme.muted}DD` }]}>{description}</Text>
      {ctaLabel && onPressCta ? (
        <PressableScale style={[styles.cta, { backgroundColor: theme.primary }]} onPress={onPressCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    padding: Space[4],
    alignItems: 'center',
    gap: Space[2],
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  title: { ...Typography.section },
  description: { ...Typography.body, textAlign: 'center', opacity: 0.86 },
  cta: {
    marginTop: Space[2],
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
    borderRadius: Radius.full,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
