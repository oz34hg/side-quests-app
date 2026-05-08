import { Platform } from 'react-native';

export const Space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export const Typography = {
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 24, // 1.6 ratio for readability
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
};

export const FontStack = Platform.select({
  web: "Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: 'System',
});
