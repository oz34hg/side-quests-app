import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image, LayoutChangeEvent, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BentoCard } from '@/components/bento-card';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenEnter } from '@/components/screen-enter';
import { Typography } from '@/constants/design';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { hapticSuccess } from '@/utils/haptics';

const PRONOUN_PRESETS = ['He/Him', 'She/Her', 'They/Them', 'Mc/Fattie', 'Dutch/Bros', 'Custom'] as const;
const PROFILE_BG_PRESETS = ['#101018', '#1e1e2e', '#232136', '#2d353b', '#282828', '#24283b', '#0f1720', '#31111d'];

function normalizeHex(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const v = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
}

function formatSince(createdAt: unknown): string {
  const maybeDate =
    createdAt && typeof createdAt === 'object' && 'toDate' in (createdAt as Record<string, unknown>)
      ? ((createdAt as { toDate: () => Date }).toDate?.() ?? null)
      : createdAt instanceof Date
        ? createdAt
        : null;
  if (!maybeDate) return 'Member since recently';
  const now = Date.now();
  const then = maybeDate.getTime();
  if (!Number.isFinite(then) || then <= 0 || then > now) return 'Member since recently';
  const days = Math.max(1, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
  if (days < 30) return `Member for ${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Member for ${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `Member for ${years} year${years === 1 ? '' : 's'}`;
}

function badgeTitle(id: string): string {
  if (id === 'mcfattie') return 'McFattie Badge';
  return id;
}

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const tabBarHeight = useBottomTabBarHeight();
  const appearanceSheetRef = useRef<BottomSheetModal>(null);
  const scrollY = useSharedValue(0);
  const heroHeightSV = useSharedValue(260);

  const { user, profile, signOut, updateDisplayName, uploadProfilePhoto, uploadProfileBanner, updateProfileExtras } =
    useAuth();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [aboutMe, setAboutMe] = useState(profile?.aboutMe ?? '');
  const [statusLine, setStatusLine] = useState((profile as { statusLine?: string } | null)?.statusLine ?? '');
  const [accentDraft, setAccentDraft] = useState((profile as { profileAccentColor?: string } | null)?.profileAccentColor ?? '#7c6cf0');
  const [pronouns, setPronouns] = useState(profile?.pronouns ?? 'They/Them');
  const [customPronouns1, setCustomPronouns1] = useState(profile?.pronounsCustomPart1 ?? '');
  const [customPronouns2, setCustomPronouns2] = useState(profile?.pronounsCustomPart2 ?? '');
  const [bgDraft, setBgDraft] = useState(profile?.profileBackgroundColor ?? '#101018');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName ?? '');
    setAboutMe(profile.aboutMe ?? '');
    setPronouns(profile.pronouns ?? 'They/Them');
    setCustomPronouns1(profile.pronounsCustomPart1 ?? '');
    setCustomPronouns2(profile.pronounsCustomPart2 ?? '');
    setBgDraft(profile.profileBackgroundColor ?? '#101018');
    setStatusLine((profile as { statusLine?: string }).statusLine ?? '');
    setAccentDraft((profile as { profileAccentColor?: string }).profileAccentColor ?? '#7c6cf0');
  }, [profile]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const h = heroHeightSV.value;
    const start = Math.max(h - 52, 72);
    const opacity = interpolate(scrollY.value, [start, start + 48], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  const onHeroLayout = useCallback((e: LayoutChangeEvent) => {
    heroHeightSV.value = e.nativeEvent.layout.height;
  }, [heroHeightSV]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.52} pressBehavior="close" />
    ),
    [],
  );

  const saveName = async () => {
    setBusy(true);
    try {
      await updateDisplayName(name);
      void hapticSuccess();
      showToast({ title: 'Saved', message: 'Display name updated.', tone: 'success' });
    } catch (e) {
      showToast({ title: 'Save failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      showToast({ title: 'Photos permission needed', message: 'Allow library access to set a profile picture.', tone: 'info' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setBusy(true);
    try {
      await uploadProfilePhoto(picked.assets[0].uri);
    } catch (e) {
      showToast({ title: 'Upload failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const pickBanner = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      showToast({ title: 'Photos permission needed', message: 'Allow library access to set a profile banner.', tone: 'info' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 6],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setBusy(true);
    try {
      await uploadProfileBanner(picked.assets[0].uri);
    } catch (e) {
      showToast({ title: 'Upload failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const chosenPronounsValue =
    pronouns === 'Custom'
      ? `${customPronouns1.trim() || 'first'}/${customPronouns2.trim() || 'second'}`
      : pronouns;

  const saveIdentity = async () => {
    setBusy(true);
    try {
      await updateProfileExtras({
        pronouns: chosenPronounsValue,
        pronounsCustomPart1: customPronouns1.trim(),
        pronounsCustomPart2: customPronouns2.trim(),
      });
      void hapticSuccess();
      showToast({ title: 'Saved', message: 'Identity updated.', tone: 'success' });
    } catch (e) {
      showToast({ title: 'Save failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveStory = async () => {
    setBusy(true);
    try {
      await updateProfileExtras({
        aboutMe: aboutMe.trim(),
        statusLine: statusLine.trim(),
      });
      void hapticSuccess();
      showToast({ title: 'Saved', message: 'Profile card updated.', tone: 'success' });
    } catch (e) {
      showToast({ title: 'Save failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveAppearanceColors = async () => {
    const bg = normalizeHex(bgDraft);
    const accent = normalizeHex(accentDraft);
    if (!bg) {
      showToast({ title: 'Invalid color', message: 'Use a valid hex color like #1e1e2e.', tone: 'error' });
      return;
    }
    if (!accent) {
      showToast({ title: 'Invalid accent', message: 'Use a valid hex color like #7c6cf0.', tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await updateProfileExtras({
        profileBackgroundColor: bg,
        profileAccentColor: accent,
      });
      void hapticSuccess();
      showToast({ title: 'Appearance saved', tone: 'success' });
      appearanceSheetRef.current?.dismiss();
    } catch (e) {
      showToast({ title: 'Update failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const accentColor = normalizeHex((profile as { profileAccentColor?: string } | null)?.profileAccentColor ?? '') ?? Mocha.purple;
  const profileBg = normalizeHex(profile?.profileBackgroundColor ?? '') ?? Mocha.bg1;
  const displayPronouns = profile?.pronouns?.trim() || pronouns;
  const badges = profile?.badges ?? [];
  const frameStyle =
    profile?.equippedProfileFrame === 'frame_gold'
      ? styles.frameGold
      : profile?.equippedProfileFrame === 'frame_neon'
        ? styles.frameNeon
        : null;

  const openAppearanceSheet = () => appearanceSheetRef.current?.present();

  return (
    <ScreenEnter>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
        <Animated.View
          style={[
            styles.floatHeader,
            {
              paddingTop: insets.top + 6,
              borderBottomColor: `${theme.border}66`,
            },
            headerAnimatedStyle,
          ]}
          pointerEvents="none">
          <BlurView tint="dark" intensity={55} style={StyleSheet.absoluteFillObject} />
          <Text allowFontScaling={false} style={[styles.floatHeaderTitle, { color: theme.text }]}>
            {profile?.displayName || name || 'Profile'}
          </Text>
        </Animated.View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroMeasure} onLayout={onHeroLayout}>
            <PressableScale style={[styles.bannerWrap, { borderColor: accentColor }]} onPress={pickBanner} disabled={busy}>
              {profile?.bannerURL ? (
                <Image source={{ uri: profile.bannerURL }} style={styles.banner} />
              ) : (
                <View style={[styles.banner, styles.bannerPh]}>
                  <Text style={styles.bannerPhText}>Tap to add banner</Text>
                </View>
              )}
            </PressableScale>

            <View style={[styles.heroCard, { backgroundColor: profileBg, borderColor: `${accentColor}88` }]}>
              <PressableScale style={[styles.avatarWrap, frameStyle]} onPress={pickPhoto} disabled={busy}>
                {profile?.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPh]}>
                    <Text style={styles.avatarPhText}>Tap to add photo</Text>
                  </View>
                )}
              </PressableScale>
              <View style={styles.heroText}>
                <Text allowFontScaling={false} style={styles.title}>
                  {profile?.displayName || name || 'Profile'}
                </Text>
                <Text style={styles.userLine}>
                  @{profile?.username ?? '…'} {displayPronouns ? `· ${displayPronouns}` : ''}
                </Text>
                <Text style={styles.email}>{user?.email ?? 'No email on this account'}</Text>
                {statusLine ? <Text style={[styles.statusLine, { color: accentColor }]}>{statusLine}</Text> : null}
                <Text style={styles.since}>{formatSince(profile?.createdAt)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.bentoStack}>
            <BentoCard icon="badge" span="full">
              <Text style={styles.cardSectionTitle}>Identity</Text>
              <Text style={styles.label}>Display name</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="How you appear in the app"
                  placeholderTextColor={Mocha.fg4}
                />
                <PressableScale style={styles.saveBtn} onPress={saveName} disabled={busy}>
                  <Text style={styles.saveText}>Save</Text>
                </PressableScale>
              </View>

              <Text style={styles.label}>Pronouns</Text>
              <View style={styles.chipsRow}>
                {PRONOUN_PRESETS.map((p) => (
                  <PressableScale key={p} style={[styles.chip, pronouns === p && styles.chipOn]} onPress={() => setPronouns(p)}>
                    <Text style={[styles.chipText, pronouns === p && styles.chipTextOn]}>{p}</Text>
                  </PressableScale>
                ))}
              </View>
              {pronouns === 'Custom' ? (
                <View style={styles.customPronounsCol}>
                  <TextInput
                    style={styles.input}
                    value={customPronouns1}
                    onChangeText={setCustomPronouns1}
                    placeholder="first pronoun"
                    placeholderTextColor={Mocha.fg4}
                  />
                  <TextInput
                    style={styles.input}
                    value={customPronouns2}
                    onChangeText={setCustomPronouns2}
                    placeholder="second"
                    placeholderTextColor={Mocha.fg4}
                  />
                </View>
              ) : null}

              <PressableScale style={[styles.saveWideBtn, busy && styles.disabled]} onPress={saveIdentity} disabled={busy}>
                <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save identity'}</Text>
              </PressableScale>
            </BentoCard>

            <BentoCard icon="article" span="full">
              <Text style={styles.cardSectionTitle}>Profile card</Text>
              <Text style={styles.label}>About me</Text>
              <TextInput
                style={[styles.input, styles.aboutInput]}
                value={aboutMe}
                onChangeText={setAboutMe}
                placeholder="Tell the squad about yourself..."
                placeholderTextColor={Mocha.fg4}
                multiline
                maxLength={280}
              />

              <Text style={styles.label}>Status line</Text>
              <TextInput
                style={styles.input}
                value={statusLine}
                onChangeText={setStatusLine}
                placeholder="e.g. Grinding side quests daily"
                placeholderTextColor={Mocha.fg4}
                maxLength={80}
              />

              <PressableScale style={[styles.saveWideBtn, busy && styles.disabled]} onPress={saveStory} disabled={busy}>
                <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save profile card'}</Text>
              </PressableScale>
            </BentoCard>

            <View style={styles.bentoRow}>
              <BentoCard icon="emoji-events" span="half">
                <Text style={styles.cardSectionTitle}>Badges</Text>
                <View style={styles.badgesWrap}>
                  {badges.length === 0 ? (
                    <Text style={styles.badgeEmpty}>None yet.</Text>
                  ) : (
                    badges.slice(0, 4).map((b) => (
                      <View key={b} style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{badgeTitle(b)}</Text>
                      </View>
                    ))
                  )}
                </View>
                {badges.length > 4 ? (
                  <Text style={styles.moreBadges}>+{badges.length - 4} more</Text>
                ) : null}
              </BentoCard>

              <BentoCard icon="palette" span="half" onPress={openAppearanceSheet}>
                <Text style={styles.cardSectionTitle}>Appearance</Text>
                <Text style={styles.appearanceHint}>Colors & profile chrome</Text>
                <View style={styles.colorDotsRow}>
                  <View style={[styles.colorDot, { backgroundColor: profileBg }]} />
                  <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
                </View>
                <Text style={styles.tapToEdit}>Tap to edit</Text>
              </BentoCard>
            </View>

            <BentoCard icon="exit-to-app" span="full">
              <PressableScale style={styles.signOutInner} onPress={() => void signOut()}>
                <Text style={styles.signOutText}>Sign out</Text>
              </PressableScale>
            </BentoCard>
          </View>
        </Animated.ScrollView>

        <BottomSheetModal
          ref={appearanceSheetRef}
          snapPoints={['50%', '95%']}
          enablePanDownToClose
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={{ backgroundColor: theme.muted, width: 42, height: 4 }}
          backgroundStyle={{ backgroundColor: theme.card }}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore">
          <BottomSheetScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Appearance</Text>
            <Text style={styles.sheetSubtitle}>Profile background & accent colors.</Text>

            <Text style={styles.label}>Profile background color</Text>
            <View style={styles.colorPresetRow}>
              {PROFILE_BG_PRESETS.map((c) => (
                <PressableScale
                  key={c}
                  style={[
                    styles.colorPresetDot,
                    { backgroundColor: c },
                    bgDraft.toLowerCase() === c.toLowerCase() ? styles.colorPresetOn : null,
                  ]}
                  onPress={() => setBgDraft(c)}
                />
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={bgDraft}
              onChangeText={setBgDraft}
              placeholder="#1e1e2e"
              placeholderTextColor={Mocha.fg4}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Profile accent color</Text>
            <TextInput
              style={styles.input}
              value={accentDraft}
              onChangeText={setAccentDraft}
              placeholder="#7c6cf0"
              placeholderTextColor={Mocha.fg4}
              autoCapitalize="characters"
            />

            <PressableScale style={[styles.saveWideBtn, busy && styles.disabled]} onPress={saveAppearanceColors} disabled={busy}>
              <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save appearance'}</Text>
            </PressableScale>
          </BottomSheetScrollView>
        </BottomSheetModal>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  floatHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  floatHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  heroMeasure: { gap: 0 },
  bannerWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: -18 },
  banner: { width: '100%', height: 142, backgroundColor: Mocha.bg2 },
  bannerPh: { justifyContent: 'center', alignItems: 'center' },
  bannerPhText: { color: Mocha.fg4 },
  heroCard: {
    marginTop: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  heroText: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '900', color: Mocha.rosewater, letterSpacing: -0.5 },
  userLine: { color: Mocha.lavender, fontSize: 14, fontWeight: '700' },
  email: { ...Typography.caption, color: Mocha.fg3 },
  statusLine: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  since: { color: Mocha.fg2, fontSize: 12, marginTop: 4 },
  avatarWrap: { padding: 3, borderRadius: 50, borderWidth: 2, borderColor: `${Mocha.purple}66` },
  frameGold: { borderColor: '#f9e2af', shadowColor: '#f9e2af', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  frameNeon: { borderColor: '#89b4fa', shadowColor: '#89b4fa', shadowOpacity: 0.65, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Mocha.bg2 },
  avatarPh: { justifyContent: 'center', alignItems: 'center', padding: 8 },
  avatarPhText: { color: Mocha.fg4, textAlign: 'center', fontSize: 12 },
  bentoStack: { gap: 12, marginTop: 4 },
  bentoRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  cardSectionTitle: {
    color: Mocha.rosewater,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  appearanceHint: { color: Mocha.fg3, fontSize: 13, fontWeight: '600' },
  colorDotsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: `${Mocha.fg0}33` },
  tapToEdit: { color: Mocha.blue, fontSize: 12, fontWeight: '800', marginTop: 10 },
  moreBadges: { color: Mocha.fg4, fontSize: 11, marginTop: 4 },
  label: { color: Mocha.fg3, fontSize: 12, marginTop: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customPronounsCol: { gap: 8 },
  input: {
    flex: 1,
    backgroundColor: Mocha.bg1,
    borderRadius: 14,
    padding: 14,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  aboutInput: { minHeight: 88, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  colorPresetDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  colorPresetOn: { borderColor: Mocha.fg0 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Mocha.bg1,
  },
  chipOn: { borderColor: Mocha.blue, backgroundColor: `${Mocha.blue}22` },
  chipText: { color: Mocha.fg2, fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: Mocha.blue },
  saveBtn: {
    backgroundColor: Mocha.blue,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveWideBtn: {
    backgroundColor: Mocha.blue,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 0,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: Mocha.fg0, fontWeight: '800' },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgePill: {
    backgroundColor: `${Mocha.orange}22`,
    borderWidth: 1,
    borderColor: `${Mocha.orange}88`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgePillText: { color: Mocha.orange, fontWeight: '800', fontSize: 11 },
  badgeEmpty: { color: Mocha.fg4, fontStyle: 'italic', fontSize: 13 },
  signOutInner: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  signOutText: { color: Mocha.red, fontWeight: '800', fontSize: 16 },
  sheetScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  sheetSubtitle: { ...Typography.body, color: Mocha.fg3, marginBottom: 8 },
});
