import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ScreenEnter } from '@/components/screen-enter';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { useToast } from '@/context/ToastContext';

type StoreItem = {
  id: string;
  title: string;
  description: string;
  kind: 'bubbleEffect' | 'chatAnimation' | 'profileFrame';
  cost: number;
};

const STORE_ITEMS: StoreItem[] = [
  { id: 'bubble_neon', title: 'Neon Bubble Aura', description: 'Glowy neon border around your message bubbles.', kind: 'bubbleEffect', cost: 14 },
  { id: 'bubble_sparkle', title: 'Sparkle Bubble Aura', description: 'Soft sparkly outline around your bubbles.', kind: 'bubbleEffect', cost: 18 },
  { id: 'chat_confetti', title: 'Confetti Burst', description: 'Trigger a confetti burst animation in chat.', kind: 'chatAnimation', cost: 12 },
  { id: 'chat_fireworks', title: 'Fireworks Pop', description: 'Trigger a fireworks emoji animation in chat.', kind: 'chatAnimation', cost: 20 },
  { id: 'frame_gold', title: 'Golden Frame', description: 'A golden profile picture frame.', kind: 'profileFrame', cost: 10 },
  { id: 'frame_neon', title: 'Neon Frame', description: 'A bright neon profile picture frame.', kind: 'profileFrame', cost: 16 },
];

export default function StoreScreen() {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { showToast } = useToast();
  const { user, profile, updateProfileExtras } = useAuth();
  const { activeGroupId, stats, purchaseStoreItem } = useGroup();
  const points = user ? stats.get(user.uid)?.questPoints ?? 0 : 0;
  const owned = new Set(profile?.ownedStoreItems ?? []);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const livePreviewItemId = previewItemId ??
    profile?.equippedBubbleEffect ??
    profile?.equippedChatAnimation ??
    profile?.equippedProfileFrame ??
    STORE_ITEMS[0].id;
  const previewItem = STORE_ITEMS.find((x) => x.id === livePreviewItemId) ?? STORE_ITEMS[0];

  const equippedFor = (kind: StoreItem['kind']): string | null => {
    if (kind === 'bubbleEffect') return profile?.equippedBubbleEffect ?? null;
    if (kind === 'chatAnimation') return profile?.equippedChatAnimation ?? null;
    return profile?.equippedProfileFrame ?? null;
  };

  const equip = async (item: StoreItem) => {
    try {
      if (item.kind === 'bubbleEffect') await updateProfileExtras({ equippedBubbleEffect: item.id });
      else if (item.kind === 'chatAnimation') await updateProfileExtras({ equippedChatAnimation: item.id });
      else await updateProfileExtras({ equippedProfileFrame: item.id });
    } catch (e) {
      showToast({ title: 'Equip failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    }
  };

  const unequip = async (item: StoreItem) => {
    try {
      if (item.kind === 'bubbleEffect') await updateProfileExtras({ equippedBubbleEffect: null });
      else if (item.kind === 'chatAnimation') await updateProfileExtras({ equippedChatAnimation: null });
      else await updateProfileExtras({ equippedProfileFrame: null });
    } catch (e) {
      showToast({ title: 'Unequip failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    }
  };

  const buy = async (item: StoreItem) => {
    if (!activeGroupId) {
      showToast({ title: 'Join a group first', tone: 'info' });
      return;
    }
    try {
      await purchaseStoreItem(item.id, item.cost, item.kind);
      await equip(item);
      showToast({ title: 'Purchased', message: `${item.title} unlocked and equipped.`, tone: 'success' });
    } catch (e) {
      showToast({ title: 'Purchase failed', message: e instanceof Error ? e.message : 'Purchase failed', tone: 'error' });
    }
  };

  return (
    <ScreenEnter>
      <SafeAreaView style={styles.root} edges={['top']}>
        <Text allowFontScaling={false} style={[styles.title, { color: theme.text }]}>
          Store
        </Text>
        <Text style={[styles.sub, { color: theme.muted }]}>Quest points: {points}</Text>
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: `${theme.card}E0`,
              borderColor: `${theme.border}AA`,
              shadowColor: theme.primary,
            },
          ]}>
          <Text style={[styles.previewTitle, { color: theme.text }]}>Live preview</Text>
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewAvatar,
                previewItem.id === 'frame_gold' ? styles.previewFrameGold : null,
                previewItem.id === 'frame_neon' ? styles.previewFrameNeon : null,
              ]}>
              <Text style={styles.previewAvatarText}>@you</Text>
            </View>
            <View style={styles.previewBubbleWrap}>
              <View
                style={[
                  styles.previewBubble,
                  previewItem.id === 'bubble_neon' ? styles.previewBubbleNeon : null,
                  previewItem.id === 'bubble_sparkle' ? styles.previewBubbleSparkle : null,
                ]}>
                <Text style={styles.previewBubbleText}>Preview message bubble</Text>
              </View>
              {(previewItem.id === 'chat_confetti' || previewItem.id === 'chat_fireworks') ? (
                <Text style={styles.previewFxText}>
                  {previewItem.id === 'chat_fireworks' ? '🎆  🎇  🎆' : '🎉  ✨  🎉'}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.previewItemName, { color: theme.muted }]}>{previewItem.title}</Text>
        </View>
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}>
          {STORE_ITEMS.map((item) => {
            const has = owned.has(item.id);
            const equipped = equippedFor(item.kind) === item.id;
            return (
              <PressableScale
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: `${theme.card}E0`,
                    borderColor: `${theme.border}AA`,
                    shadowColor: theme.primary,
                  },
                  previewItem.id === item.id ? styles.previewSelectedCard : null,
                ]}
                onPress={() => setPreviewItemId(item.id)}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.itemDesc, { color: theme.muted }]}>{item.description}</Text>
                <View style={styles.row}>
                  <Text style={styles.cost}>{item.cost} pts</Text>
                  {equipped ? (
                    <View style={styles.row}>
                      <Text style={styles.equipped}>Equipped</Text>
                      <PressableScale style={styles.equipBtn} onPress={() => void unequip(item)}>
                        <Text style={styles.equipText}>Unequip</Text>
                      </PressableScale>
                    </View>
                  ) : has ? (
                    <PressableScale style={styles.equipBtn} onPress={() => void equip(item)}>
                      <Text style={styles.equipText}>Equip</Text>
                    </PressableScale>
                  ) : (
                    <PressableScale style={styles.buyBtn} onPress={() => void buy(item)}>
                      <Text style={styles.buyText}>Buy</Text>
                    </PressableScale>
                  )}
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h, padding: 16 },
  title: { color: Mocha.rosewater, fontSize: 26, fontWeight: '800' },
  sub: { color: Mocha.fg3, marginBottom: 10 },
  list: { gap: 10, paddingBottom: 32 },
  previewCard: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 8,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  previewTitle: { fontWeight: '800', fontSize: 14 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Mocha.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Mocha.bg2,
  },
  previewAvatarText: { color: Mocha.fg1, fontSize: 10, fontWeight: '700' },
  previewFrameGold: { borderColor: '#f9e2af' },
  previewFrameNeon: { borderColor: '#89b4fa' },
  previewBubbleWrap: { flex: 1, gap: 4 },
  previewBubble: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.34)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  previewBubbleText: { color: Mocha.fg1, fontSize: 12 },
  previewBubbleNeon: { borderColor: '#80d8ff' },
  previewBubbleSparkle: { borderColor: '#f9e2af', backgroundColor: 'rgba(60, 51, 33, 0.4)' },
  previewFxText: { fontSize: 18 },
  previewItemName: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: Mocha.bg1,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Mocha.bg3,
    padding: 12,
    gap: 6,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  itemTitle: { color: Mocha.fg0, fontSize: 16, fontWeight: '800' },
  itemDesc: { color: Mocha.fg3, fontSize: 13 },
  previewSelectedCard: { borderColor: Mocha.blue },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cost: { color: Mocha.orange, fontWeight: '700' },
  equipped: { color: Mocha.green, fontWeight: '800' },
  buyBtn: { backgroundColor: Mocha.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  buyText: { color: Mocha.fg0, fontWeight: '800' },
  equipBtn: { backgroundColor: Mocha.bg2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Mocha.bg3 },
  equipText: { color: Mocha.fg0, fontWeight: '800' },
});
