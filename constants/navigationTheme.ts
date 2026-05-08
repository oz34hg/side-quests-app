import { DarkTheme } from '@react-navigation/native';
export function buildNavigationTheme(colors: {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
}) {
  return {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: '#ed4956',
    },
  };
}
