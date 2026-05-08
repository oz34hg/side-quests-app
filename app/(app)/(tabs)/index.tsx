import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CozyEnter } from '@/components/cozy-enter';
import { RemoteVideoView } from '@/components/remote-video-view';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenEnter } from '@/components/screen-enter';
import { Mocha } from '@/constants/mocha';
import { SIDE_QUESTS, questById } from '@/constants/quests';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { pickVideoRecording } from '@/lib/pickVideo';
import { formatDayKeyLabel, seededSlot } from '@/utils/dateKey';

function statScore(
  s: { messagesSent: number; sideQuestsCompleted: number; vlogsUploaded: number; questPoints?: number },
  key: 'messagesSent' | 'sideQuestsCompleted' | 'vlogsUploaded' | 'questPoints',
): number {
  if (key === 'questPoints') return s.questPoints ?? 0;
  return s[key] ?? 0;
}

function miniRank(
  stats: Map<string, { messagesSent: number; sideQuestsCompleted: number; vlogsUploaded: number; questPoints?: number }>,
  members: Map<string, { username: string }>,
  key: 'messagesSent' | 'sideQuestsCompleted' | 'vlogsUploaded' | 'questPoints',
  title: string,
  color: string,
) {
  const rows = [...stats.entries()]
    .map(([uid, s]) => ({
      uid,
      score: statScore(s, key),
      name: members.get(uid)?.username ?? '…',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return (
    <View style={sb.board}>
      <Text style={[sb.boardTitle, { color }]}>{title}</Text>
      {rows.map((r, i) => (
        <Text key={r.uid} style={sb.line} numberOfLines={1}>
          {i + 1}. {r.name} ({r.score})
        </Text>
      ))}
    </View>
  );
}

export default function TodayScreen() {
  const { user } = useAuth();
  const {
    loading,
    activeGroupId,
    group,
    members,
    day,
    stats,
    dayKey,
    vlogsToday,
    submitQuestProof,
    uploadDayVlog,
    voteQuest,
    bumpDayKey,
  } = useGroup();

  const [busy, setBusy] = useState(false);
  const [todayVlogOpen, setTodayVlogOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      bumpDayKey();
    }, [bumpDayKey]),
  );

  const assigneeName = day ? members.get(day.assigneeUserId)?.username : null;

  /** Stored quest text, else catalog by id, else a stable “random” pick from the current list for legacy ids. */
  const { questBodyText, questTier } = useMemo(() => {
    if (!day) {
      return { questBodyText: null as string | null, questTier: null as 'easy' | 'medium' | 'hard' | null };
    }
    const stored = day.questText?.trim();
    if (stored) {
      return {
        questBodyText: stored,
        questTier: day.questTier ?? questById(day.questId)?.tier ?? null,
      };
    }
    const byId = questById(day.questId);
    if (byId) {
      return { questBodyText: byId.text, questTier: byId.tier };
    }
    if (SIDE_QUESTS.length > 0) {
      const idx = seededSlot(`${day.dayKey}|${day.questId}`, SIDE_QUESTS.length);
      const q = SIDE_QUESTS[idx];
      return { questBodyText: q.text, questTier: q.tier };
    }
    return { questBodyText: null, questTier: null };
  }, [day]);
  const isAssignee = Boolean(user && day && day.assigneeUserId === user.uid);
  const voterIds = useMemo(
    () => (group?.memberIds ?? []).filter((id) => id !== day?.assigneeUserId),
    [group?.memberIds, day?.assigneeUserId],
  );

  const recordQuestProof = async () => {
    if (!user || !day || day.assigneeUserId !== user.uid) {
      Alert.alert('Side quest', 'Only the person assigned today’s side quest can submit proof.');
      return;
    }
    setBusy(true);
    try {
      const uri = await pickVideoRecording({ maxDurationSeconds: 120, purpose: 'proof' });
      if (uri) await submitQuestProof(uri);
    } catch (e) {
      Alert.alert('Video', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const recordVlog = async () => {
    setBusy(true);
    try {
      const uri = await pickVideoRecording({ maxDurationSeconds: 180, purpose: 'vlog' });
      if (uri) await uploadDayVlog(uri);
    } catch (e) {
      Alert.alert('Vlog', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ScreenEnter>
        <SafeAreaView style={[styles.root, styles.center]}>
          <ActivityIndicator color={Mocha.fg3} size="large" />
        </SafeAreaView>
      </ScreenEnter>
    );
  }

  return (
    <ScreenEnter>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.bodyRow}>
        <ScrollView
          style={styles.main}
          contentContainerStyle={styles.mainScroll}
          removeClippedSubviews={false}>
          <CozyEnter>
            <View>
          <View style={styles.headerRow}>
            <View style={[styles.cornerCard, styles.squadCard]}>
              <Text style={styles.cornerLabel}>Squad</Text>
              {!activeGroupId ? (
                <Text style={styles.muted}>Open the Group tab.</Text>
              ) : members.size === 0 ? (
                <Text style={styles.muted}>Loading members…</Text>
              ) : (
                <ScrollView style={styles.squadScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {[...members.entries()].map(([id, m]) => {
                    const hot = day?.assigneeUserId === id;
                    const me = user?.uid === id;
                    return (
                      <View key={id} style={[styles.memberChip, hot && styles.memberChipHot]}>
                        <View style={[styles.dot, me && styles.dotMe]} />
                        <Text style={styles.memberName} numberOfLines={1}>
                          @{m.username}
                          {me ? ' (you)' : ''}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={[styles.cornerCard, styles.questCard]}>
              <Text style={styles.cornerLabel}>{"Today's side quest"}</Text>
              {!activeGroupId ? (
                <Text style={styles.muted}>Open the Group tab to pick a squad.</Text>
              ) : !group ? (
                <Text style={styles.muted}>Loading group…</Text>
              ) : (group.memberIds?.length ?? 0) < 2 ? (
                <Text style={styles.muted}>
                  Invite one more person — daily quests rotate once there are at least two members.
                </Text>
              ) : !group.anchorDayKey ? (
                <Text style={styles.muted}>Setting up rotation…</Text>
              ) : !day ? (
                <Text style={styles.muted}>Syncing today’s quest…</Text>
              ) : day.sideQuestStatus === 'skipped' ? (
                <Text style={styles.muted}>Assignee skipped the side quest today.</Text>
              ) : (
                <>
                  {questTier ? (
                    <Text style={styles.tier}>
                      {questTier === 'easy' ? '●' : questTier === 'medium' ? '●●' : '●●●'} {questTier}{' '}
                      · optional
                    </Text>
                  ) : null}
                  <Text style={styles.questBody}>{questBodyText ?? '—'}</Text>
                  <Text style={styles.assigneeLine}>
                    Assignee: <Text style={styles.assigneeName}>@{assigneeName ?? '…'}</Text>
                  </Text>
                </>
              )}
            </View>
          </View>

          {activeGroupId && day && group?.anchorDayKey ? (
            <>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Day vlog (everyone)</Text>
                <Text style={styles.panelText}>
                  Open the folder to watch or add clips for today. Older days are on the Archive tab. Clips count toward the
                  vlog scoreboard.
                </Text>
                <PressableScale style={styles.folderBtnSingle} onPress={() => setTodayVlogOpen(true)}>
                  <Text style={styles.folderBtnText}>Open today’s clip folder</Text>
                  <Text style={styles.folderBtnHint}>{vlogsToday.length} video{vlogsToday.length === 1 ? '' : 's'}</Text>
                </PressableScale>
              </View>

              {day.sideQuestStatus === 'open' && isAssignee ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Your side quest (optional)</Text>
                  <Text style={styles.panelText}>Record proof so the squad can vote.</Text>
                  <PressableScale style={[styles.primaryBtn, busy && styles.btnDisabled]} disabled={busy} onPress={recordQuestProof}>
                    <Text style={styles.primaryBtnText}>Record proof</Text>
                  </PressableScale>
                </View>
              ) : null}

              {day.sideQuestStatus === 'open' && !isAssignee ? (
                <View style={styles.panel}>
                  <Text style={styles.panelText}>
                    Waiting for @{assigneeName} to submit proof for the optional side quest.
                  </Text>
                </View>
              ) : null}

              {day.sideQuestStatus === 'voting' && day.proofVideoUrl ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Side quest vote</Text>
                  <RemoteVideoView uri={day.proofVideoUrl} />
                  {voterIds.map((vid) => {
                    const v = day.votes?.[vid];
                    const isRowMe = user?.uid === vid;
                    return (
                      <View key={vid} style={styles.voteRow}>
                        <Text style={styles.voterName}>
                          @{members.get(vid)?.username ?? vid.slice(0, 6)}
                          {isRowMe ? ' (you)' : ''}
                        </Text>
                        {isRowMe ? (
                          <View style={styles.voteBtns}>
                            <PressableScale
                              style={[styles.voteBtn, v === 'pass' && styles.voteSelected]}
                              onPress={() => void voteQuest('pass').catch((e) => Alert.alert('Vote', String(e)))}>
                              <Text style={styles.voteBtnText}>Pass</Text>
                            </PressableScale>
                            <PressableScale
                              style={[styles.voteBtn, v === 'fail' && styles.voteSelected]}
                              onPress={() => void voteQuest('fail').catch((e) => Alert.alert('Vote', String(e)))}>
                              <Text style={styles.voteBtnText}>Fail</Text>
                            </PressableScale>
                          </View>
                        ) : (
                          <Text style={styles.voteStatus}>{v === 'pass' ? 'Pass' : v === 'fail' ? 'Fail' : '…'}</Text>
                        )}
                      </View>
                    );
                  })}
                  {user?.uid === day.assigneeUserId ? (
                    <Text style={styles.muted}>You cannot vote on your own quest.</Text>
                  ) : null}
                </View>
              ) : null}

              {day.sideQuestStatus === 'resolved' && day.resolution ? (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Side quest result</Text>
                  <Text
                    style={[
                      styles.resultText,
                      day.resolution === 'passed' ? styles.passColor : styles.failColor,
                    ]}>
                    {day.resolution === 'passed' ? 'Passed' : 'Failed'}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

            </View>
          </CozyEnter>
        </ScrollView>

        {activeGroupId ? (
          <View style={styles.sidebar}>
            <Text style={styles.sideHeader}>Quest pts</Text>
            {miniRank(stats, members, 'questPoints', 'Pts', Mocha.rosewater)}
            <Text style={[styles.sideHeader, styles.sideHeaderSpaced]}>Live ranks</Text>
            {miniRank(stats, members, 'messagesSent', 'Msgs', Mocha.aqua)}
            {miniRank(stats, members, 'sideQuestsCompleted', 'Quests', Mocha.purple)}
            {miniRank(stats, members, 'vlogsUploaded', 'Vlogs', Mocha.orange)}
          </View>
        ) : null}
      </View>

      <Modal
        visible={todayVlogOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setTodayVlogOpen(false)}>
        <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitles}>
              <Text style={styles.modalTitle}>Today’s clips</Text>
              <Text style={styles.modalSubtitle}>{formatDayKeyLabel(dayKey)}</Text>
            </View>
            <Pressable onPress={() => setTodayVlogOpen(false)} hitSlop={12} style={styles.modalDone}>
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeIn.duration(380)}>
              <PressableScale
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={recordVlog}>
                <Text style={styles.primaryBtnText}>{busy ? '…' : 'Add clip'}</Text>
              </PressableScale>
              {vlogsToday.length === 0 ? (
                <Text style={styles.muted}>No clips yet — record one with the button above.</Text>
              ) : (
                vlogsToday.map((v) => {
                  const who = members.get(v.data.userId)?.username ?? v.data.userId.slice(0, 6);
                  return (
                    <View key={v.id} style={styles.vlogBlock}>
                      <Text style={styles.vlogWho}>@{who}</Text>
                      <RemoteVideoView uri={v.data.videoUrl} />
                    </View>
                  );
                })
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const sb = StyleSheet.create({
  board: { marginBottom: 10, gap: 2 },
  boardTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  line: { color: Mocha.fg3, fontSize: 10 },
});

const cozyCard = Platform.select({
  web: { boxShadow: '0 8px 32px rgba(17, 17, 27, 0.55)' },
  ios: {
    shadowColor: Mocha.crust,
    shadowOpacity: 0.42,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  android: { elevation: 10 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  center: { justifyContent: 'center', alignItems: 'center' },
  bodyRow: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
  mainScroll: { paddingBottom: 36, paddingLeft: 12, paddingRight: 6, paddingTop: 8 },
  sidebar: {
    width: 108,
    borderLeftWidth: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: Mocha.bg0,
  },
  sideHeader: {
    color: Mocha.rosewater,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sideHeaderSpaced: { marginTop: 6 },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    minHeight: 150,
  },
  cornerCard: {
    flex: 1,
    backgroundColor: Mocha.bg1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    ...cozyCard,
  },
  squadCard: { maxWidth: '46%' },
  questCard: { flex: 1.2 },
  cornerLabel: {
    color: Mocha.flamingo,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  squadScroll: { maxHeight: 180 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Mocha.bg2,
  },
  memberChipHot: {
    backgroundColor: Mocha.bg2,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderBottomWidth: 0,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Mocha.aqua },
  dotMe: { backgroundColor: Mocha.orange },
  memberName: { color: Mocha.fg1, fontSize: 11, flex: 1 },
  muted: { color: Mocha.fg4, fontSize: 12, marginTop: 4 },
  tier: { color: Mocha.gray, fontSize: 10, marginBottom: 4 },
  questBody: { color: Mocha.fg0, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  assigneeLine: { marginTop: 6, color: Mocha.fg3, fontSize: 11 },
  assigneeName: { color: Mocha.purple, fontWeight: '700' },
  panel: {
    marginHorizontal: 10,
    marginTop: 14,
    backgroundColor: Mocha.bg1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    gap: 12,
    ...cozyCard,
  },
  panelTitle: { color: Mocha.blue, fontSize: 16, fontWeight: '700' },
  panelText: { color: Mocha.fg2, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: Mocha.blue,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: Mocha.fg0, fontWeight: '800', fontSize: 15 },
  vlogBlock: { gap: 4 },
  vlogWho: { color: Mocha.lavender, fontSize: 12, fontWeight: '700' },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
  },
  voterName: { color: Mocha.fg1, fontSize: 14, flex: 1 },
  voteBtns: { flexDirection: 'row', gap: 8 },
  voteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    backgroundColor: Mocha.bg2,
  },
  voteSelected: { borderColor: Mocha.yellow, backgroundColor: Mocha.bg3 },
  voteBtnText: { color: Mocha.fg0, fontWeight: '600', fontSize: 13 },
  voteStatus: { color: Mocha.fg3, fontSize: 14, fontWeight: '600', minWidth: 48, textAlign: 'right' },
  resultText: { fontSize: 20, fontWeight: '800' },
  passColor: { color: Mocha.green },
  failColor: { color: Mocha.red },
  folderBtnSingle: {
    backgroundColor: Mocha.bg2,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Mocha.blue,
    gap: 4,
  },
  folderBtnText: { color: Mocha.fg0, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  folderBtnHint: { color: Mocha.fg4, fontSize: 11, textAlign: 'center' },
  modalRoot: { flex: 1, backgroundColor: Mocha.bg0_h },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Mocha.bg3,
    gap: 12,
  },
  modalHeaderTitles: { flex: 1, gap: 2 },
  modalTitle: { color: Mocha.rosewater, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: Mocha.fg3, fontSize: 13 },
  modalDone: { paddingVertical: 6, paddingHorizontal: 4 },
  modalDoneText: { color: Mocha.blue, fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
});
