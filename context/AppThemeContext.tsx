import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = '@side_quests/theme_name';
const REDUCE_MOTION_KEY = '@side_quests/reduce_motion';
const COMPACT_SIDEBAR_KEY = '@side_quests/compact_sidebar';
const SHOW_ORBS_KEY = '@side_quests/show_orbs';

export const APP_THEMES = {
  darkPro: {
    label: 'Dark Pro',
    primary: '#0095f6',
    background: '#000000',
    card: '#1c1c1e',
    border: '#2c2c2e',
    text: '#fafafa',
    muted: '#737373',
    palette: ['#000000', '#121212', '#1c1c1e', '#2c2c2e', '#737373', '#0095f6', '#7c6cf0', '#f5a524'],
  },
  nordic: {
    label: 'Nordic',
    primary: '#88c0d0',
    background: '#2e3440',
    card: '#3b4252',
    border: '#4c566a',
    text: '#eceff4',
    muted: '#a3acc0',
    palette: ['#2e3440', '#3b4252', '#434c5e', '#4c566a', '#88c0d0', '#81a1c1', '#8fbcbb', '#eceff4'],
  },
  gruvbox: {
    label: 'Gruvbox',
    primary: '#fabd2f',
    background: '#282828',
    card: '#3c3836',
    border: '#504945',
    text: '#ebdbb2',
    muted: '#a89984',
    palette: ['#282828', '#3c3836', '#504945', '#665c54', '#a89984', '#fabd2f', '#fe8019', '#b8bb26'],
  },
  everforest: {
    label: 'Everforest',
    primary: '#a7c080',
    background: '#2d353b',
    card: '#343f44',
    border: '#475258',
    text: '#d3c6aa',
    muted: '#9da9a0',
    palette: ['#2d353b', '#343f44', '#475258', '#859289', '#9da9a0', '#a7c080', '#7fbbb3', '#e69875'],
  },
  catppuccin: {
    label: 'Catppuccin',
    primary: '#89b4fa',
    background: '#1e1e2e',
    card: '#313244',
    border: '#45475a',
    text: '#cdd6f4',
    muted: '#a6adc8',
    palette: ['#1e1e2e', '#313244', '#45475a', '#585b70', '#89b4fa', '#cba6f7', '#f9e2af', '#f38ba8'],
  },
  tokyoNight: {
    label: 'Tokyo Night',
    primary: '#7aa2f7',
    background: '#1a1b26',
    card: '#24283b',
    border: '#414868',
    text: '#c0caf5',
    muted: '#7a83a8',
    palette: ['#1a1b26', '#24283b', '#414868', '#565f89', '#7aa2f7', '#bb9af7', '#9ece6a', '#f7768e'],
  },
  dracula: {
    label: 'Dracula',
    primary: '#bd93f9',
    background: '#282a36',
    card: '#343746',
    border: '#44475a',
    text: '#f8f8f2',
    muted: '#b0b3c2',
    palette: ['#282a36', '#343746', '#44475a', '#6272a4', '#bd93f9', '#ff79c6', '#50fa7b', '#ffb86c'],
  },
  solarizedDark: {
    label: 'Solarized Dark',
    primary: '#268bd2',
    background: '#002b36',
    card: '#073642',
    border: '#0f4a57',
    text: '#93a1a1',
    muted: '#657b83',
    palette: ['#002b36', '#073642', '#0f4a57', '#657b83', '#93a1a1', '#268bd2', '#2aa198', '#b58900'],
  },
  oceanic: {
    label: 'Oceanic',
    primary: '#4da6ff',
    background: '#0f1720',
    card: '#152231',
    border: '#254057',
    text: '#d9ecff',
    muted: '#89a2b7',
    palette: ['#0f1720', '#152231', '#254057', '#2d5d7a', '#4da6ff', '#63e6be', '#8ab4ff', '#ffd166'],
  },
  rosePine: {
    label: 'Rose Pine',
    primary: '#9ccfd8',
    background: '#191724',
    card: '#1f1d2e',
    border: '#403d52',
    text: '#e0def4',
    muted: '#908caa',
    palette: ['#191724', '#1f1d2e', '#26233a', '#403d52', '#9ccfd8', '#c4a7e7', '#ebbcba', '#f6c177'],
  },
} as const;

export type ThemeName = keyof typeof APP_THEMES;
type ThemeValue = (typeof APP_THEMES)[ThemeName];

type AppThemeContextValue = {
  themeName: ThemeName;
  theme: ThemeValue;
  setThemeName: (name: ThemeName) => Promise<void>;
  reduceMotion: boolean;
  compactSidebar: boolean;
  showAmbientOrbs: boolean;
  setReduceMotion: (value: boolean) => Promise<void>;
  setCompactSidebar: (value: boolean) => Promise<void>;
  setShowAmbientOrbs: (value: boolean) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('darkPro');
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [compactSidebar, setCompactSidebarState] = useState(false);
  const [showAmbientOrbs, setShowAmbientOrbsState] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      if (!mounted || !raw) return;
      if (raw in APP_THEMES) setThemeNameState(raw as ThemeName);
      const [rm, cs, orbs] = await Promise.all([
        AsyncStorage.getItem(REDUCE_MOTION_KEY),
        AsyncStorage.getItem(COMPACT_SIDEBAR_KEY),
        AsyncStorage.getItem(SHOW_ORBS_KEY),
      ]);
      if (mounted) {
        setReduceMotionState(rm === '1');
        setCompactSidebarState(cs === '1');
        setShowAmbientOrbsState(orbs !== '0');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeName = useCallback(async (name: ThemeName) => {
    setThemeNameState(name);
    await AsyncStorage.setItem(THEME_KEY, name);
  }, []);

  const setReduceMotion = useCallback(async (value: boolean) => {
    setReduceMotionState(value);
    await AsyncStorage.setItem(REDUCE_MOTION_KEY, value ? '1' : '0');
  }, []);

  const setCompactSidebar = useCallback(async (value: boolean) => {
    setCompactSidebarState(value);
    await AsyncStorage.setItem(COMPACT_SIDEBAR_KEY, value ? '1' : '0');
  }, []);

  const setShowAmbientOrbs = useCallback(async (value: boolean) => {
    setShowAmbientOrbsState(value);
    await AsyncStorage.setItem(SHOW_ORBS_KEY, value ? '1' : '0');
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      themeName,
      theme: APP_THEMES[themeName],
      setThemeName,
      reduceMotion,
      compactSidebar,
      showAmbientOrbs,
      setReduceMotion,
      setCompactSidebar,
      setShowAmbientOrbs,
    }),
    [
      compactSidebar,
      reduceMotion,
      setCompactSidebar,
      setReduceMotion,
      setShowAmbientOrbs,
      setThemeName,
      showAmbientOrbs,
      themeName,
    ],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
