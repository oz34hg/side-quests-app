import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, Typography } from '@/constants/design';

type ToastTone = 'info' | 'success' | 'error';
type ToastMessage = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (opts: { title: string; message?: string; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback(({ title, message, tone = 'info' }: { title: string; message?: string; tone?: ToastTone }) => {
    const item: ToastMessage = { id: Date.now() + Math.floor(Math.random() * 1000), title, message, tone };
    setQueue((prev) => [...prev.slice(-2), item]);
    setTimeout(() => {
      setQueue((prev) => prev.filter((t) => t.id !== item.id));
    }, 2600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[styles.layer, { top: insets.top + (Platform.OS === 'web' ? 12 : 6) }]}>
        {queue.map((toast) => (
          <View key={toast.id} style={[styles.toast, toneStyle[toast.tone]]}>
            <Text style={styles.title}>{toast.title}</Text>
            {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const toneStyle = StyleSheet.create({
  info: { borderColor: 'rgba(125, 211, 252, 0.45)' },
  success: { borderColor: 'rgba(134, 239, 172, 0.5)' },
  error: { borderColor: 'rgba(252, 165, 165, 0.5)' },
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: Space[3],
    right: Space[3],
    gap: Space[2],
    zIndex: 5000,
  },
  toast: {
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    ...Typography.caption,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  message: {
    ...Typography.caption,
    color: '#CBD5E1',
  },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
