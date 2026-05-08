import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
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
import { APP_THEMES, useAppTheme } from '@/context/AppThemeContext';
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
  color: string,
  maxRows = 5,
) {
  const rows = [...stats.entries()]
    .map(([uid, s]) => ({
      uid,
      score: statScore(s, key),
      name: members.get(uid)?.username ?? '…',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRows);
  return (
    <View style={[sb.board, { borderColor: `${color}99` }]}>
      {rows.map((r, i) => (
        <View key={r.uid} style={sb.lineRow}>
          <Text style={[sb.rankBadge, i === 0 && sb.rankBadgeTop]}>{i + 1}</Text>
          <Text style={sb.line} numberOfLines={1}>
            {r.name}
          </Text>
          <Text style={[sb.lineScore, { color }]}>{r.score}</Text>
        </View>
      ))}
    </View>
  );
}

export default function TodayScreen() {
  const { user } = useAuth();
  const {
    themeName,
    theme,
    setThemeName,
    reduceMotion,
    compactSidebar,
    showAmbientOrbs,
    setReduceMotion,
    setCompactSidebar,
    setShowAmbientOrbs,
  } = useAppTheme();
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
  const tabBarHeight = useBottomTabBarHeight();

  const [busy, setBusy] = useState(false);
  const [todayVlogOpen, setTodayVlogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.bodyRow}>
        <ScrollView
          style={[styles.main, webSnapScroll as any]}
          contentContainerStyle={[styles.mainScroll, { paddingBottom: tabBarHeight + 48 }]}
          removeClippedSubviews={false}>
          <CozyEnter>
            <View style={webSnapChild as any}>
          <View style={styles.headerRow}>
            <View style={[styles.cornerCard, glassCard as any, styles.squadCard, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
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

            <View style={[styles.cornerCard, glassCard as any, styles.questCard, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
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
              <View style={[styles.panel, webSnapChild as any, glassCard as any, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
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
                <View style={[styles.panel, webSnapChild as any, glassCard as any, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
                  <Text style={styles.panelTitle}>Your side quest (optional)</Text>
                  <Text style={styles.panelText}>Record proof so the squad can vote.</Text>
                  <Text style={styles.videoConstraint}>Minimum clip length: 1 minute.</Text>
                  <PressableScale style={[styles.primaryBtn, busy && styles.btnDisabled]} disabled={busy} onPress={recordQuestProof}>
                    <Text style={styles.primaryBtnText}>Record proof</Text>
                  </PressableScale>
                </View>
              ) : null}

              {day.sideQuestStatus === 'open' && !isAssignee ? (
                <View style={[styles.panel, webSnapChild as any, glassCard as any, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
                  <Text style={styles.panelText}>
                    Waiting for @{assigneeName} to submit proof for the optional side quest.
                  </Text>
                </View>
              ) : null}

              {day.sideQuestStatus === 'voting' && day.proofVideoUrl ? (
                <View style={[styles.panel, webSnapChild as any, glassCard as any, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
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
                <View style={[styles.panel, webSnapChild as any, glassCard as any, { backgroundColor: `${theme.card}DD`, borderColor: theme.border }]}>
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
          <View style={[styles.sidebar, compactSidebar ? styles.sidebarCompact : null, { backgroundColor: theme.card }]}>
            <Text style={styles.sideHeader}>Quest Points</Text>
            {miniRank(stats, members, 'questPoints', Mocha.rosewater, compactSidebar ? 3 : 5)}
            <Text style={[styles.sideHeader, styles.sideHeaderSpaced]}>Live ranks</Text>
            <Text style={styles.rankLabel}>Messages</Text>
            {miniRank(stats, members, 'messagesSent', Mocha.aqua, compactSidebar ? 3 : 5)}
            <Text style={styles.rankLabel}>Side Quests</Text>
            {miniRank(stats, members, 'sideQuestsCompleted', Mocha.purple, compactSidebar ? 3 : 5)}
            <Text style={styles.rankLabel}>Vlogs</Text>
            {miniRank(stats, members, 'vlogsUploaded', Mocha.orange, compactSidebar ? 3 : 5)}
            <PressableScale style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
              <MaterialIcons name="settings" size={16} color={Mocha.fg1} />
              <Text style={styles.settingsBtnText}>Settings</Text>
            </PressableScale>
          </View>
        ) : null}
      </View>

      <Modal
        visible={todayVlogOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setTodayVlogOpen(false)}>
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <View style={[styles.modalHeader, glassCard as any]}>
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
              <Text style={styles.videoConstraint}>Minimum clip length: 1 minute.</Text>
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

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.themeModalRoot}>
          <Pressable style={styles.themeBackdrop} onPress={() => setSettingsOpen(false)} />
          <View style={[styles.themeSheet, glassCard as any]}>
            <Text style={styles.themeTitle}>Settings</Text>
            <Text style={styles.themeSubtitle}>Theme + app behavior options.</Text>
            <Pressable
              style={[styles.optionRow, reduceMotion && styles.optionRowOn]}
              onPress={() => void setReduceMotion(!reduceMotion)}>
              <Text style={styles.optionName}>Reduce motion</Text>
              <Text style={styles.optionValue}>{reduceMotion ? 'On' : 'Off'}</Text>
            </Pressable>
            <Pressable
              style={[styles.optionRow, compactSidebar && styles.optionRowOn]}
              onPress={() => void setCompactSidebar(!compactSidebar)}>
              <Text style={styles.optionName}>Compact sidebar</Text>
              <Text style={styles.optionValue}>{compactSidebar ? 'On' : 'Off'}</Text>
            </Pressable>
            <Pressable
              style={[styles.optionRow, !showAmbientOrbs && styles.optionRowOn]}
              onPress={() => void setShowAmbientOrbs(!showAmbientOrbs)}>
              <Text style={styles.optionName}>Ambient orbs</Text>
              <Text style={styles.optionValue}>{showAmbientOrbs ? 'On' : 'Off'}</Text>
            </Pressable>
            <Text style={styles.themeGroupLabel}>Themes</Text>
            {Object.entries(APP_THEMES).map(([key, t]) => {
              const selected = key === themeName;
              return (
                <Pressable
                  key={key}
                  style={[styles.themeRow, selected && styles.themeRowOn]}
                  onPress={() => {
                    void setThemeName(key as keyof typeof APP_THEMES);
                    setSettingsOpen(false);
                  }}>
                  <Text style={styles.themeName}>{t.label}</Text>
                  <View style={styles.paletteRow}>
                    {t.palette.map((p) => (
                      <View key={`${key}-${p}`} style={[styles.themeSwatch, { backgroundColor: p }]} />
                    ))}
                  </View>
                  {selected ? <MaterialIcons name="check-circle" size={18} color={Mocha.green} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const sb = StyleSheet.create({
  board: {
    marginBottom: 10,
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    backgroundColor: `${Mocha.bg2}77`,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  rankBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 9,
    lineHeight: 16,
    color: Mocha.bg0_h,
    backgroundColor: Mocha.fg3,
    fontWeight: '800',
  },
  rankBadgeTop: {
    backgroundColor: Mocha.yellow,
  },
  line: { color: Mocha.fg1, fontSize: 10, flex: 1 },
  lineScore: { fontSize: 10, fontWeight: '900' },
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

const webSnapScroll = Platform.OS === 'web' ? ({ scrollSnapType: 'y mandatory' } as const) : null;
const webSnapChild = Platform.OS === 'web' ? ({ scrollSnapAlign: 'start' } as const) : null;
const glassCard = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(18px) saturate(1.15)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.15)',
    } as const)
  : null;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  center: { justifyContent: 'center', alignItems: 'center' },
  bodyRow: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
  mainScroll: { paddingBottom: 128, paddingLeft: 12, paddingRight: 8, paddingTop: 8 },
  sidebar: {
    width: 108,
    borderLeftWidth: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: Mocha.bg0,
  },
  sidebarCompact: { width: 96 },
  sideHeader: {
    color: Mocha.rosewater,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sideHeaderSpaced: { marginTop: 6 },
  rankLabel: {
    color: Mocha.fg4,
    fontSize: 8,
    textTransform: 'uppercase',
    fontWeight: '800',
    marginBottom: 2,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    minHeight: 160,
  },
  cornerCard: {
    flex: 1,
    backgroundColor: Mocha.bg1,
    borderRadius: 24,
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
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    gap: 12,
    ...cozyCard,
  },
  panelTitle: { color: Mocha.blue, fontSize: 16, fontWeight: '700' },
  panelText: { color: Mocha.fg2, fontSize: 14, lineHeight: 20 },
  videoConstraint: { color: Mocha.fg4, fontSize: 12, marginTop: -2 },
  primaryBtn: {
    backgroundColor: Mocha.blue,
    paddingVertical: 14,
    borderRadius: 18,
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
    borderRadius: 16,
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
    borderRadius: 18,
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
    borderBottomWidth: 1,
    borderBottomColor: `${Mocha.bg3}AA`,
    gap: 12,
  },
  modalHeaderTitles: { flex: 1, gap: 2 },
  modalTitle: { color: Mocha.rosewater, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: Mocha.fg3, fontSize: 13 },
  modalDone: { paddingVertical: 6, paddingHorizontal: 4 },
  modalDoneText: { color: Mocha.blue, fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  settingsBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Mocha.bg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    borderRadius: 18,
    paddingVertical: 8,
  },
  settingsBtnText: { color: Mocha.fg1, fontSize: 11, fontWeight: '800' },
  themeModalRoot: { flex: 1, justifyContent: 'flex-end' },
  themeBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  themeSheet: { backgroundColor: `${Mocha.bg1}EE`, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 10 },
  themeTitle: { color: Mocha.rosewater, fontSize: 20, fontWeight: '800' },
  themeSubtitle: { color: Mocha.fg3, fontSize: 12, marginBottom: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Mocha.bg3,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionRowOn: { borderColor: Mocha.green, backgroundColor: `${Mocha.green}22` },
  optionName: { flex: 1, color: Mocha.fg1, fontWeight: '700', fontSize: 13 },
  optionValue: { color: Mocha.fg3, fontSize: 12, fontWeight: '700' },
  themeGroupLabel: { color: Mocha.fg3, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Mocha.bg3, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10 },
  themeRowOn: { borderColor: Mocha.green, backgroundColor: `${Mocha.green}22` },
  paletteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' },
  themeSwatch: { width: 12, height: 12, borderRadius: 3 },
  themeName: { width: 96, color: Mocha.fg1, fontWeight: '700', fontSize: 12 },
});
