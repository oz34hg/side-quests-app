import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Radius, Space, Typography } from '@/constants/design';
import { ScreenEnter } from '@/components/screen-enter';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { useToast } from '@/context/ToastContext';
import { hapticSuccess } from '@/utils/haptics';

export default function GroupScreen() {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const {
    activeGroupId,
    group,
    members,
    createNewGroup,
    joinGroupById,
    setActiveGroup,
    startRotation,
    resetRotation,
  } = useGroup();
  const [joinId, setJoinId] = useState('');
  const [newName, setNewName] = useState('My squad');
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setBusy(true);
    try {
      const id = await createNewGroup(newName);
      void hapticSuccess();
      showToast({ title: 'Group created', message: `Share id: ${id}`, tone: 'success' });
    } catch (e) {
      showToast({ title: 'Create failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setBusy(true);
    try {
      await joinGroupById(joinId);
      void hapticSuccess();
      setJoinId('');
      showToast({ title: 'Joined group', tone: 'success' });
    } catch (e) {
      showToast({ title: 'Join failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const confirmLeaveGroup = () => {
    const message = 'You can rejoin with the id later.';
    const runLeave = () => {
      setTimeout(() => {
        void setActiveGroup(null);
      }, 0);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Leave group?\n\n${message}`)) runLeave();
      return;
    }
    Alert.alert('Leave group?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: runLeave },
    ]);
  };

  return (
    <ScreenEnter>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Space[4] }]}
          keyboardShouldPersistTaps="handled">
        <Text allowFontScaling={false} style={styles.title}>
          Group
        </Text>
        <Text style={styles.sub}>
          Logged in as <Text style={styles.bold}>@{profile?.username}</Text>. Create a squad or
          paste a group id to join. One active group is stored on this device.
        </Text>

        {activeGroupId ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active group</Text>
            <Text style={styles.mono}>{activeGroupId}</Text>
            <Text style={styles.muted}>{group?.name ?? '…'} · {(group?.memberIds?.length ?? 0)} members</Text>
            <PressableScale style={styles.dangerOutline} onPress={confirmLeaveGroup}>
              <Text style={styles.dangerText}>Leave Group</Text>
            </PressableScale>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Group name"
            placeholderTextColor={Mocha.fg4}
          />
          <PressableScale style={[styles.primaryBtn, busy && styles.disabled]} disabled={busy} onPress={onCreate}>
            <Text style={styles.primaryBtnText}>Create new group</Text>
          </PressableScale>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join with id</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={joinId}
              onChangeText={setJoinId}
              placeholder="Paste group id"
              placeholderTextColor={Mocha.fg4}
              autoCapitalize="none"
            />
            <PressableScale style={styles.addBtn} disabled={busy} onPress={onJoin}>
              <Text style={styles.addBtnText}>Join</Text>
            </PressableScale>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily side quest rotation</Text>
          <Text style={styles.muted}>
            {group?.anchorDayKey
              ? `Started ${group.anchorDayKey} — one assignee per local day, rotating through the squad. Quest pool refreshes after each full round.`
              : 'With two or more members, rotation starts automatically. You can still post vlogs any time.'}
          </Text>
          {(group?.memberIds?.length ?? 0) < 2 ? (
            <Text style={styles.warn}>Need at least two members to roll daily quests.</Text>
          ) : !group?.anchorDayKey ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.muted}>Starting automatically… If nothing appears on Today, tap below.</Text>
              <PressableScale style={styles.primaryBtn} disabled={busy} onPress={() => void startRotation()}>
                <Text style={styles.primaryBtnText}>Start rotation now</Text>
              </PressableScale>
            </View>
          ) : (
            <PressableScale
              style={styles.dangerOutline}
              onPress={() => {
                Alert.alert('Reset rotation?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => void resetRotation() },
                ]);
              }}>
              <Text style={styles.dangerText}>Reset rotation anchor</Text>
            </PressableScale>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Members</Text>
          {members.size === 0 ? (
            activeGroupId ? (
              <View style={styles.skeletonList}>
                <Skeleton style={styles.memberSkeleton} />
                <Skeleton style={styles.memberSkeleton} />
                <Skeleton style={styles.memberSkeletonShort} />
              </View>
            ) : (
              <EmptyState
                icon="groups"
                title="No group yet"
                description="Create a new squad or paste an invite id to collaborate."
                ctaLabel="Create group"
                onPressCta={() => void onCreate()}
              />
            )
          ) : (
            [...members.entries()].map(([id, m]) => (
              <Text key={id} style={styles.memberLine}>
                @{m.username} · {m.displayName}
              </Text>
            ))
          )}
        </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  scroll: { padding: Space[4], paddingBottom: Space[10], gap: Space[4] },
  title: { ...Typography.title, color: Mocha.rosewater },
  sub: { ...Typography.body, color: Mocha.fg3 },
  bold: { color: Mocha.fg1, fontWeight: '700' },
  card: {
    backgroundColor: Mocha.bg1,
    borderRadius: Radius.lg,
    padding: Space[4],
    borderWidth: 0.5,
    borderColor: `${Mocha.bg3}AA`,
    gap: Space[3],
    shadowColor: Mocha.blue,
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardTitle: {
    color: Mocha.flamingo,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  muted: { color: Mocha.fg4, fontSize: 13 },
  mono: { color: Mocha.aqua, fontFamily: 'monospace', fontSize: 13 },
  warn: { color: Mocha.orange, fontSize: 13 },
  row: { flexDirection: 'row', gap: Space[2], alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Mocha.bg0,
    borderRadius: 14,
    padding: 14,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg2,
  },
  addBtn: {
    backgroundColor: Mocha.blue,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBtnText: { color: Mocha.fg0, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: Mocha.blue,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: Mocha.fg0, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  dangerOutline: {
    borderWidth: 1,
    borderColor: Mocha.red,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  dangerText: { color: Mocha.red, fontWeight: '700' },
  memberLine: { color: Mocha.fg1, fontSize: 14, paddingVertical: 4 },
  skeletonList: { gap: Space[2], paddingTop: Space[1] },
  memberSkeleton: { width: '100%', height: 18, borderRadius: Radius.sm },
  memberSkeletonShort: { width: '65%', height: 18, borderRadius: Radius.sm },
});
