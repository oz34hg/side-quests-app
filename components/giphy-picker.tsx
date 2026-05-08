import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Mocha } from '@/constants/mocha';
import { getGiphyApiKey, searchGiphy, type GiphyGif } from '@/lib/giphy';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (gifUrl: string) => void;
};

export function GiphyPicker({ visible, onClose, onPick }: Props) {
  const { width } = useWindowDimensions();
  const cellPad = 6;
  const columns = 3;
  const cellW = Math.floor((width - 32 - cellPad * (columns - 1)) / columns);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GiphyGif[]>([]);
  const hasKey = !!getGiphyApiKey();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    if (!hasKey) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const list = await searchGiphy(debounced);
      setResults(list);
    } finally {
      setLoading(false);
    }
  }, [debounced, hasKey]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const styles = baseStyles;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close GIF picker" />
        <View style={[styles.sheet, { borderColor: Mocha.bg3 }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: Mocha.rosewater }]}>Giphy</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <MaterialIcons name="close" size={24} color={Mocha.fg2} />
            </Pressable>
          </View>
          {!hasKey ? (
            <Text style={[styles.warn, { color: Mocha.orange }]}>
              Add EXPO_PUBLIC_GIPHY_API_KEY to your .env (developers.giphy.com) and restart Expo.
            </Text>
          ) : (
            <>
              <View style={[styles.searchRow, { borderColor: Mocha.bg3, backgroundColor: Mocha.bg0 }]}>
                <MaterialIcons name="search" size={20} color={Mocha.fg4} />
                <TextInput
                  style={[styles.searchInput, { color: Mocha.fg0 }]}
                  placeholder="Search GIFs"
                  placeholderTextColor={Mocha.fg4}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={Mocha.blue} />
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  numColumns={columns}
                  columnWrapperStyle={columns > 1 ? styles.columnWrap : undefined}
                  contentContainerStyle={styles.gridContent}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text style={[styles.empty, { color: Mocha.fg4 }]}>
                      {debounced ? 'No GIFs found.' : 'Trending GIFs appear here.'}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        onPick(item.url);
                        onClose();
                      }}
                      style={[styles.cell, { width: cellW }]}
                      accessibilityRole="button"
                      accessibilityLabel="Send GIF">
                      <Image
                        source={{ uri: item.previewUrl }}
                        style={[styles.thumb, { width: cellW, height: cellW }]}
                        contentFit="cover"
                      />
                    </Pressable>
                  )}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    maxHeight: '78%',
    backgroundColor: Mocha.bg1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800' },
  warn: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  columnWrap: { gap: 6, marginBottom: 6 },
  gridContent: { paddingBottom: 16 },
  cell: { borderRadius: 10, overflow: 'hidden' },
  thumb: { borderRadius: 10, backgroundColor: Mocha.bg2 },
  center: { paddingVertical: 40, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
});
