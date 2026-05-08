import { useMemo } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ScreenEnter } from '@/components/screen-enter';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useGroup } from '@/context/GroupContext';

function statScore(
  s: { messagesSent: number; sideQuestsCompleted: number; vlogsUploaded: number; questPoints?: number },
  key: 'messagesSent' | 'sideQuestsCompleted' | 'vlogsUploaded' | 'questPoints',
): number {
  if (key === 'questPoints') return s.questPoints ?? 0;
  return s[key] ?? 0;
}

function rankRows(
  stats: Map<string, { messagesSent: number; sideQuestsCompleted: number; vlogsUploaded: number; questPoints?: number }>,
  members: Map<string, { username: string }>,
  key: 'messagesSent' | 'sideQuestsCompleted' | 'vlogsUploaded' | 'questPoints',
) {
  return [...stats.entries()]
    .map(([uid, s]) => ({
      uid,
      score: statScore(s, key),
      name: members.get(uid)?.username ?? uid.slice(0, 6),
    }))
    .sort((a, b) => b.score - a.score);
}

function Board({
  title,
  rows,
  color,
}: {
  title: string;
  rows: { uid: string; score: number; name: string }[];
  color: string;
}) {
  return (
    <View style={styles.board}>
      <Text style={[styles.boardTitle, { color }]}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.muted}>No stats yet.</Text>
      ) : (
        rows.slice(0, 20).map((r, i) => (
          <View key={r.uid} style={styles.row}>
            <Text style={styles.rank}>{i + 1}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.score}>{r.score}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function ScoreboardsScreen() {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { activeGroupId, stats, members } = useGroup();

  const byMessages = useMemo(() => rankRows(stats, members, 'messagesSent'), [stats, members]);
  const byQuests = useMemo(
    () => rankRows(stats, members, 'sideQuestsCompleted'),
    [stats, members],
  );
  const byQuestPoints = useMemo(() => rankRows(stats, members, 'questPoints'), [stats, members]);
  const byVlogs = useMemo(() => rankRows(stats, members, 'vlogsUploaded'), [stats, members]);

  if (!activeGroupId) {
    return (
      <ScreenEnter>
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="leaderboard"
              title="No scoreboard yet"
              description="Join or create a group to start tracking rankings."
            />
          </View>
        </SafeAreaView>
      </ScreenEnter>
    );
  }

  return (
    <ScreenEnter>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.headerWrap}>
          <BlurView tint="dark" intensity={40} style={styles.headerBlur} />
          <Text allowFontScaling={false} style={styles.header}>
            Scoreboards
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={[styles.scrollCol, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}>
          <Board title="Messages" rows={byMessages} color={Mocha.aqua} />
          <Board title="Quest points" rows={byQuestPoints} color={Mocha.rosewater} />
          <Board title="Side quests" rows={byQuests} color={Mocha.purple} />
          <Board title="Vlog clips" rows={byVlogs} color={Mocha.orange} />
        </ScrollView>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  headerWrap: {
    overflow: 'hidden',
    backgroundColor: 'rgba(16,16,22,0.28)',
    borderBottomWidth: 0.5,
    borderBottomColor: `${Mocha.bg3}AA`,
  },
  headerBlur: { ...StyleSheet.absoluteFillObject },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: Mocha.rosewater,
    paddingHorizontal: 16,
    paddingBottom: 10,
    letterSpacing: -0.5,
  },
  muted: { color: Mocha.fg4, padding: 16 },
  emptyWrap: { paddingHorizontal: 16, paddingTop: 24 },
  scrollCol: {
    paddingHorizontal: 12,
    paddingBottom: 32,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  board: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 16,
    paddingBottom: 20,
    backgroundColor: Mocha.bg1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  boardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Mocha.bg2,
  },
  rank: { width: 22, color: Mocha.gray, fontWeight: '700' },
  name: { flex: 1, color: Mocha.fg1, fontSize: 14 },
  score: { color: Mocha.fg0, fontWeight: '800', minWidth: 28, textAlign: 'right' },
});
