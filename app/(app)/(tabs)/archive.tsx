import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Fragment, useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { RemoteVideoView } from '@/components/remote-video-view';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenEnter } from '@/components/screen-enter';
import { Space, Typography } from '@/constants/design';
import { StaggerFadeItem } from '@/components/stagger-fade-item';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useGroup } from '@/context/GroupContext';
import { formatDayKeyArchiveHeading } from '@/utils/dateKey';

export default function ArchiveScreen() {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { activeGroupId, vlogPastSections, members } = useGroup();
  const clipSheetRef = useRef<BottomSheetModal>(null);
  const [selectedClip, setSelectedClip] = useState<{ uri: string; who: string } | null>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.48} pressBehavior="close" />
    ),
    [],
  );

  const openClip = useCallback((uri: string, who: string) => {
    setSelectedClip({ uri, who });
    queueMicrotask(() => clipSheetRef.current?.present());
  }, []);

  const onSheetDismiss = useCallback(() => {
    setSelectedClip(null);
  }, []);

  return (
    <ScreenEnter>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.headerWrap}>
          <BlurView tint="dark" intensity={40} style={styles.headerBlur} />
          <Text allowFontScaling={false} style={styles.header}>
            Clip archive
          </Text>
          <Text style={styles.sub}>Older day vlogs, newest days first.</Text>
        </View>
        {!activeGroupId ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="video-library"
              title="No group connected"
              description="Join or create a group to unlock the shared clip archive."
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Space[4] }]}
            showsVerticalScrollIndicator={false}>
            {vlogPastSections.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="movie-filter"
                  title="No archive clips yet"
                  description="Once your group uploads daily clips, they will appear here by day."
                />
              </View>
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
                            <PressableScale style={styles.clipTap} onPress={() => openClip(v.data.videoUrl, who)}>
                              <RemoteVideoView uri={v.data.videoUrl} />
                            </PressableScale>
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

        <BottomSheetModal
          ref={clipSheetRef}
          snapPoints={['50%', '95%']}
          enablePanDownToClose
          enableDynamicSizing={false}
          onDismiss={onSheetDismiss}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={{ backgroundColor: theme.muted, width: 42, height: 4 }}
          backgroundStyle={{ backgroundColor: theme.card }}>
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            {selectedClip ? (
              <Animated.View key={selectedClip.uri} entering={ZoomIn.springify().damping(17).stiffness(220)}>
                <Text style={[styles.sheetWho, { color: theme.text }]}>@{selectedClip.who}</Text>
                <RemoteVideoView uri={selectedClip.uri} />
              </Animated.View>
            ) : null}
          </BottomSheetScrollView>
        </BottomSheetModal>
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
    ...Typography.title,
    color: Mocha.rosewater,
    paddingHorizontal: Space[4],
    paddingTop: Space[2],
  },
  sub: { ...Typography.body, color: Mocha.fg3, paddingHorizontal: Space[4], paddingBottom: Space[3] },
  scroll: { paddingHorizontal: Space[4], paddingBottom: Space[10], gap: Space[2] },
  muted: { color: Mocha.fg4, fontSize: 14, paddingHorizontal: 16 },
  emptyWrap: { paddingVertical: Space[6] },
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
  clipBlock: { gap: 6, marginLeft: Space[2], paddingLeft: Space[2], borderLeftWidth: 0.5, borderLeftColor: `${Mocha.bg3}CC` },
  clipTap: { alignSelf: 'stretch' },
  clipWho: { color: Mocha.lavender, fontSize: 13, fontWeight: '700' },
  sheetContent: { paddingHorizontal: Space[4], paddingBottom: Space[8], gap: Space[3] },
  sheetWho: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  footnote: { color: Mocha.fg4, fontSize: 11, lineHeight: 16, marginTop: 12, paddingBottom: 8 },
});
