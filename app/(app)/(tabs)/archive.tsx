import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RemoteVideoView } from '@/components/remote-video-view';
import { ScreenEnter } from '@/components/screen-enter';
import { StaggerFadeItem } from '@/components/stagger-fade-item';
import { Mocha } from '@/constants/mocha';
import { useGroup } from '@/context/GroupContext';
import { formatDayKeyArchiveHeading } from '@/utils/dateKey';

export default function ArchiveScreen() {
  const { activeGroupId, vlogPastSections, members } = useGroup();

  return (
    <ScreenEnter>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <Text style={styles.header}>Clip archive</Text>
        <Text style={styles.sub}>Older day vlogs, newest days first.</Text>
        {!activeGroupId ? (
          <Text style={styles.muted}>Join or create a group first.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {vlogPastSections.length === 0 ? (
              <Text style={styles.muted}>No past clips in the loaded window yet.</Text>
            ) : (
              <Fragment>
                {vlogPastSections.map((sec, idx) => (
                  <StaggerFadeItem key={sec.dayKey} index={idx}>
                    <View style={styles.daySection}>
                      <Text style={styles.dayHeading}>{formatDayKeyArchiveHeading(sec.dayKey)}</Text>
                      <View style={styles.rule} />
                      {sec.entries.map((v) => {
                        const who = members.get(v.data.userId)?.username ?? v.data.userId.slice(0, 6);
                        return (
                          <View key={v.id} style={styles.clipBlock}>
                            <Text style={styles.clipWho}>@{who}</Text>
                            <RemoteVideoView uri={v.data.videoUrl} />
                          </View>
                        );
                      })}
                    </View>
                  </StaggerFadeItem>
                ))}
              </Fragment>
            )}
            <Text style={styles.footnote}>
              Shows recent uploads across the squad (up to ~520), excluding today. Open the Today tab for today’s folder.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: Mocha.rosewater,
    paddingHorizontal: 16,
    paddingTop: 8,
    letterSpacing: 0.2,
  },
  sub: { color: Mocha.fg3, fontSize: 14, paddingHorizontal: 16, paddingBottom: 12, lineHeight: 20 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  muted: { color: Mocha.fg4, fontSize: 14, paddingHorizontal: 16 },
  daySection: { marginBottom: 28, gap: 12 },
  dayHeading: {
    color: Mocha.flamingo,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  rule: {
    height: 1,
    backgroundColor: Mocha.bg3,
    marginTop: -4,
    marginBottom: 4,
  },
  clipBlock: { gap: 6, marginLeft: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: Mocha.bg3 },
  clipWho: { color: Mocha.lavender, fontSize: 13, fontWeight: '700' },
  footnote: { color: Mocha.fg4, fontSize: 11, lineHeight: 16, marginTop: 12, paddingBottom: 8 },
});
