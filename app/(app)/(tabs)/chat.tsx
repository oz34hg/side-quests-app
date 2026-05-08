import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { doc, getDoc } from 'firebase/firestore';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

import { GiphyPicker } from '@/components/giphy-picker';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenEnter } from '@/components/screen-enter';
import { EmptyState } from '@/components/ui/empty-state';
import { Space, Typography } from '@/constants/design';
import { Mocha } from '@/constants/mocha';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/AppThemeContext';
import { useGroup } from '@/context/GroupContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { hapticSelection, hapticSuccess } from '@/utils/haptics';

const CHAT_DEFAULT_BG = Mocha.bg0_h;
const BG_PRESETS = [
  Mocha.bg0_h,
  Mocha.bg0,
  Mocha.bg1,
  '#181818',
  '#141414',
  '#0d1117',
  '#0f1419',
];

/** Default message bubbles: subtle dark glass. */
const BUBBLE_BG = 'rgba(0, 0, 0, 0.34)';
const BUBBLE_OUTLINE = 'rgba(255, 255, 255, 0.05)';

type Row = {
  id: string;
  userId: string;
  text: string;
  gifUrl?: string | null;
  showMeta: boolean;
};

const MENU_WIDTH = 200;
const MENU_ROW_HEIGHT = 48;

type MessageMenuAnchor = { id: string; x: number; y: number; w: number; h: number };
type UserMiniProfile = {
  uid: string;
  username?: string;
  displayName?: string;
  photoURL?: string | null;
  aboutMe?: string;
  pronouns?: string;
  badges?: string[];
  equippedBubbleEffect?: string | null;
  equippedChatAnimation?: string | null;
  equippedProfileFrame?: string | null;
};

export default function ChatScreen() {
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, profile } = useAuth();
  const {
    activeGroupId,
    group,
    members,
    messages,
    postMessage,
    updateChatMessage,
    deleteChatMessage,
    updateGroupAppearance,
    uploadGroupChatIcon,
    uploadChatWallpaper,
  } = useGroup();
  const [text, setText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [hexDraft, setHexDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messageMenu, setMessageMenu] = useState<MessageMenuAnchor | null>(null);
  const [editOpen, setEditOpen] = useState<{ id: string } | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [giphyOpen, setGiphyOpen] = useState(false);
  const [groupHubOpen, setGroupHubOpen] = useState(false);
  const [groupHubBusy, setGroupHubBusy] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<UserMiniProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserMiniProfile | null>(null);
  const [fxBurst, setFxBurst] = useState<'confetti' | 'fireworks' | null>(null);
  const [bubbleFxByUid, setBubbleFxByUid] = useState<Record<string, string | null>>({});
  const menuAnchorRefs = useRef<Record<string, View | null>>({});
  const notify = useCallback(
    (title: string, message: string, tone: 'info' | 'success' | 'error' = 'error') => {
      showToast({ title, message, tone });
    },
    [showToast],
  );

  const rows: Row[] = useMemo(
    () =>
      messages.map((msg, i) => {
        const older = messages[i + 1];
        const showMeta = !older || older.data.userId !== msg.data.userId;
        return {
          id: msg.id,
          userId: msg.data.userId,
          text: msg.data.text,
          gifUrl: msg.data.gifUrl,
          showMeta,
        };
      }),
    [messages],
  );

  const send = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await postMessage(t);
  }, [text, postMessage]);

  const sendGiphy = useCallback(
    async (gifUrl: string) => {
      setBusy(true);
      try {
        const caption = text.trim();
        await postMessage(caption, { gifUrl });
        setText('');
      } catch (e) {
        notify('GIF', e instanceof Error ? e.message : 'Could not send GIF.');
      } finally {
        setBusy(false);
      }
    },
    [notify, postMessage, text],
  );

  const closeMessageMenu = useCallback(() => setMessageMenu(null), []);

  const openMessageMenu = useCallback((item: Row) => {
    void hapticSelection();
    const node = menuAnchorRefs.current[item.id];
    node?.measureInWindow((x, y, w, h) => {
      setMessageMenu({ id: item.id, x, y, w, h });
    });
  }, []);

  const messageTextById = useCallback(
    (id: string) => messages.find((m) => m.id === id)?.data.text ?? '',
    [messages],
  );

  const messageCopyPayload = useCallback(
    (id: string) => {
      const data = messages.find((m) => m.id === id)?.data;
      if (!data) return '';
      const parts = [data.text?.trim(), data.gifUrl?.trim()].filter(Boolean);
      return parts.join('\n');
    },
    [messages],
  );

  const canEditMessage = useCallback(
    (id: string) => {
      const data = messages.find((m) => m.id === id)?.data;
      if (!data?.gifUrl) return true;
      return (data.text?.trim()?.length ?? 0) > 0;
    },
    [messages],
  );

  const onCopyMessage = useCallback(
    async (id: string) => {
      const body = messageCopyPayload(id);
      closeMessageMenu();
      try {
        await Clipboard.setStringAsync(body);
        notify('Copied', 'Message copied to clipboard.', 'success');
      } catch (e) {
        notify('Copy', e instanceof Error ? e.message : 'Failed');
      }
    },
    [closeMessageMenu, messageCopyPayload, notify],
  );

  const renderSwipeAction = useCallback(
    (id: string) => (
      <RectButton style={styles.swipeAction} onPress={() => void onCopyMessage(id)}>
        <MaterialIcons name="content-copy" size={18} color={Mocha.fg0} />
        <Text style={styles.swipeActionText}>Copy</Text>
      </RectButton>
    ),
    [onCopyMessage],
  );

  const onEditMessage = useCallback(
    (id: string) => {
      if (!canEditMessage(id)) return;
      setEditDraft(messageTextById(id));
      setEditOpen({ id });
      closeMessageMenu();
    },
    [closeMessageMenu, messageTextById, canEditMessage],
  );

  const saveEditedMessage = useCallback(async () => {
    if (!editOpen) return;
    const t = editDraft.trim();
    if (!t) return;
    setBusy(true);
    try {
      await updateChatMessage(editOpen.id, t);
      setEditOpen(null);
    } catch (e) {
      notify('Edit', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [editDraft, editOpen, notify, updateChatMessage]);

  const confirmDeleteMessage = useCallback(
    (id: string) => {
      closeMessageMenu();
      const run = () => {
        setTimeout(() => {
          void (async () => {
            setBusy(true);
            try {
              await deleteChatMessage(id);
            } catch (e) {
              notify('Delete', e instanceof Error ? e.message : 'Failed');
            } finally {
              setBusy(false);
            }
          })();
        }, 0);
      };
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm('Delete this message?')) run();
        return;
      }
      Alert.alert('Delete message?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: run },
      ]);
    },
    [closeMessageMenu, deleteChatMessage, notify],
  );

  const openSettings = useCallback(() => {
    setNameDraft(group?.name ?? '');
    setHexDraft(group?.chatBackgroundColor ?? '');
    setSettingsOpen(true);
  }, [group?.name, group?.chatBackgroundColor]);

  const pickAndUploadIcon = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Photos', 'Allow library access to set the group photo.');
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
      await uploadGroupChatIcon(picked.assets[0].uri);
    } catch (e) {
      notify('Photo', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const pickWallpaper = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Photos', 'Allow library access to set the wallpaper.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setBusy(true);
    try {
      await uploadChatWallpaper(picked.assets[0].uri);
    } catch (e) {
      notify('Wallpaper', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const applyHexColor = async () => {
    const raw = hexDraft.trim();
    if (!raw) return;
    if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) {
      notify('Color', 'Use a hex color like #121212 (6 digits after #).');
      return;
    }
    setBusy(true);
    try {
      await updateGroupAppearance({ chatBackgroundColor: raw, chatWallpaperUrl: null });
    } catch (e) {
      notify('Color', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const saveGroupName = async () => {
    const n = nameDraft.trim();
    if (!n) return;
    setBusy(true);
    try {
      await updateGroupAppearance({ name: n });
      void hapticSuccess();
      notify('Saved', 'Group name updated.', 'success');
    } catch (e) {
      notify('Name', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const openGroupHub = useCallback(async () => {
    setGroupHubOpen(true);
    if (!db || !group?.memberIds?.length) return;
    setGroupHubBusy(true);
    try {
      const docs = await Promise.all(
        group.memberIds.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid));
          const d = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
          return {
            uid,
            username: typeof d.username === 'string' ? d.username : members.get(uid)?.username ?? uid.slice(0, 6),
            displayName: typeof d.displayName === 'string' ? d.displayName : undefined,
            photoURL: typeof d.photoURL === 'string' ? d.photoURL : null,
            aboutMe: typeof d.aboutMe === 'string' ? d.aboutMe : '',
            pronouns: typeof d.pronouns === 'string' ? d.pronouns : '',
            badges: Array.isArray(d.badges) ? (d.badges as string[]) : [],
            equippedBubbleEffect:
              typeof d.equippedBubbleEffect === 'string' ? d.equippedBubbleEffect : null,
            equippedChatAnimation:
              typeof d.equippedChatAnimation === 'string' ? d.equippedChatAnimation : null,
            equippedProfileFrame:
              typeof d.equippedProfileFrame === 'string' ? d.equippedProfileFrame : null,
          } as UserMiniProfile;
        }),
      );
      setMemberProfiles(docs);
    } finally {
      setGroupHubBusy(false);
    }
  }, [group?.memberIds, members]);

  const triggerChatFx = useCallback(() => {
    const equipped = profile?.equippedChatAnimation ?? '';
    if (!equipped) {
      notify('Store', 'Equip a chat animation from the Store tab first.');
      return;
    }
    if (equipped === 'chat_fireworks') setFxBurst('fireworks');
    else setFxBurst('confetti');
    setTimeout(() => setFxBurst(null), 1300);
  }, [notify, profile?.equippedChatAnimation]);

  useEffect(() => {
    if (!db || !group?.memberIds?.length) {
      setBubbleFxByUid({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        group.memberIds.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid));
          const d = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
          return [uid, typeof d.equippedBubbleEffect === 'string' ? d.equippedBubbleEffect : null] as const;
        }),
      );
      if (!cancelled) {
        setBubbleFxByUid(Object.fromEntries(rows));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.memberIds]);

  const solidBg =
    group?.chatBackgroundColor && /^#[0-9A-Fa-f]{6}$/i.test(group.chatBackgroundColor)
      ? group.chatBackgroundColor
      : CHAT_DEFAULT_BG;

  /** Must run before any conditional return — same hook order when `activeGroupId` toggles. */
  const messageMenuLayout = useMemo(() => {
    if (!messageMenu) return null;
    const { width: winW } = Dimensions.get('window');
    const rows = canEditMessage(messageMenu.id) ? 3 : 2;
    const menuHeight = MENU_ROW_HEIGHT * rows + 14;
    const top = Math.max(56, messageMenu.y - menuHeight - 8);
    const left = Math.max(
      12,
      Math.min(messageMenu.x + messageMenu.w - MENU_WIDTH, winW - MENU_WIDTH - 12),
    );
    return { top, left };
  }, [messageMenu, canEditMessage]);

  if (!activeGroupId) {
    return (
      <ScreenEnter>
        <SafeAreaView style={styles.root} edges={['top']}>
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="forum"
              title="No group chat yet"
              description="Join or create a group to start chatting with your squad."
            />
          </View>
        </SafeAreaView>
      </ScreenEnter>
    );
  }

  const wallpaperUri = group?.chatWallpaperUrl ?? null;

  const listContent = (
    <View style={styles.threadFill}>
      {wallpaperUri ? <View style={styles.threadDim} pointerEvents="none" /> : null}
      <FlatList
        data={rows}
        inverted
        style={styles.flatList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const mine = user?.uid === item.userId;
          const m = members.get(item.userId);
          const who = m?.username ?? item.userId.slice(0, 6);
          return (
            <Swipeable
              friction={1.8}
              rightThreshold={32}
              overshootRight={false}
              renderRightActions={() => renderSwipeAction(item.id)}>
            <View style={[styles.rowWrap, mine ? styles.rowMine : styles.rowTheirs]}>
              {!mine && item.showMeta ? (
                <Text style={styles.metaName} numberOfLines={1}>
                  {who}
                </Text>
              ) : null}
              {(() => {
                const bubbleFx = mine ? profile?.equippedBubbleEffect ?? null : bubbleFxByUid[item.userId] ?? null;
                const fxStyle = bubbleFx === 'bubble_neon' ? styles.bubbleNeon : bubbleFx === 'bubble_sparkle' ? styles.bubbleSparkle : null;
                return mine ? (
                  <View style={styles.mineBubbleRow}>
                    <View
                      style={[
                        styles.bubble,
                        styles.bubbleMine,
                        fxStyle,
                        item.gifUrl ? styles.bubbleGifShell : styles.bubbleTextPad,
                        item.gifUrl ? styles.bubbleAlignEnd : null,
                      ]}>
                      {item.gifUrl ? (
                        <Image
                          source={{ uri: item.gifUrl }}
                          style={styles.bubbleGif}
                          contentFit="contain"
                          accessibilityLabel="GIF"
                        />
                      ) : null}
                      {item.text ? (
                        <Text
                          style={[
                            styles.bubbleText,
                            styles.bubbleTextMine,
                            Boolean(item.gifUrl) && styles.bubbleCaption,
                          ]}>
                          {item.text}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      collapsable={false}
                      ref={(r) => {
                        if (r) menuAnchorRefs.current[item.id] = r;
                        else delete menuAnchorRefs.current[item.id];
                      }}>
                      <Pressable
                        style={styles.messageDotsHit}
                        hitSlop={10}
                        onPress={() => openMessageMenu(item)}
                        accessibilityLabel="Message options">
                        <MaterialIcons name="more-horiz" size={22} color="rgba(255,255,255,0.88)" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleTheirs,
                      fxStyle,
                      item.gifUrl ? styles.bubbleGifShell : styles.bubbleTextPad,
                      item.gifUrl ? styles.bubbleAlignStart : null,
                    ]}>
                    {item.gifUrl ? (
                      <Image
                        source={{ uri: item.gifUrl }}
                        style={styles.bubbleGif}
                        contentFit="contain"
                        accessibilityLabel="GIF"
                      />
                    ) : null}
                    {item.text ? (
                      <Text style={[styles.bubbleText, Boolean(item.gifUrl) && styles.bubbleCaption]}>{item.text}</Text>
                    ) : null}
                  </View>
                );
              })()}
            </View>
            </Swipeable>
          );
        }}
      />
    </View>
  );

  return (
    <ScreenEnter>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <BlurView tint="dark" intensity={42} style={styles.headerBlur} />
        <PressableScale onPress={pickAndUploadIcon} disabled={busy} style={styles.headerAvatarTap}>
          {group?.groupPhotoURL ? (
            <Image source={{ uri: group.groupPhotoURL }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPh]}>
              <MaterialIcons name="group" size={26} color={Mocha.fg3} />
            </View>
          )}
        </PressableScale>
        <Pressable style={styles.headerTitles} onPress={() => void openGroupHub()}>
          <Text style={styles.headerName} numberOfLines={1}>
            {group?.name ?? 'Squad'}
          </Text>
          <Text style={styles.headerSub}>
            {(group?.memberIds?.length ?? 0)} {(group?.memberIds?.length ?? 0) === 1 ? 'member' : 'members'}
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <PressableScale onPress={triggerChatFx} style={styles.headerFx} hitSlop={10}>
            <Text style={styles.headerFxText}>FX</Text>
          </PressableScale>
          <PressableScale onPress={openSettings} style={styles.headerGear} hitSlop={12}>
            <MaterialIcons name="palette" size={24} color={Mocha.fg2} />
          </PressableScale>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {wallpaperUri ? (
          <ImageBackground source={{ uri: wallpaperUri }} style={styles.flex} imageStyle={styles.wallpaperImage}>
            {listContent}
          </ImageBackground>
        ) : (
          <View style={[styles.flex, { backgroundColor: solidBg }]}>{listContent}</View>
        )}

        <View style={[styles.composerWrap, { paddingBottom: Math.max(10, tabBarHeight + 8 - insets.bottom) }]}>
          <Text style={styles.composerHint}>GIF — tap below to pick from Giphy.</Text>
          <View style={styles.composerRow}>
            <PressableScale
              style={[styles.gifFab, busy && styles.sendFabOff]}
              onPress={() => setGiphyOpen(true)}
              disabled={busy}
              hitSlop={6}
              accessibilityLabel="Open GIF picker">
              <Text style={styles.gifFabLabel}>GIF</Text>
            </PressableScale>
            <TextInput
              style={styles.composerInput}
              placeholder="Message the fatties"
              placeholderTextColor={Mocha.fg4}
              value={text}
              onChangeText={setText}
              onSubmitEditing={send}
              multiline
              maxLength={2000}
            />
            <PressableScale
              style={[styles.sendFab, (!text.trim() || busy) && styles.sendFabOff]}
              disabled={!text.trim() || busy}
              onPress={() => void send()}>
              {busy ? (
                <ActivityIndicator color={Mocha.fg0} size="small" />
              ) : (
                <MaterialIcons name="send" size={22} color={Mocha.fg0} />
              )}
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!messageMenu} transparent animationType="fade" onRequestClose={closeMessageMenu}>
        <View style={styles.menuOverlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMessageMenu} accessibilityLabel="Close menu" />
          {messageMenu && messageMenuLayout ? (
            <Animated.View
              key={messageMenu.id}
              entering={FadeIn.duration(160).springify().damping(18).stiffness(220)}
              style={[
                styles.messageMenuBox,
                { top: messageMenuLayout.top, left: messageMenuLayout.left, width: MENU_WIDTH },
              ]}>
              <Pressable
                style={styles.menuRow}
                onPress={() => onCopyMessage(messageMenu.id)}
                accessibilityRole="button"
                accessibilityLabel="Copy message">
                <MaterialIcons name="content-copy" size={20} color={Mocha.fg1} />
                <Text style={styles.menuRowLabel}>Copy</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              {canEditMessage(messageMenu.id) ? (
                <>
                  <Pressable
                    style={styles.menuRow}
                    onPress={() => onEditMessage(messageMenu.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit message">
                    <MaterialIcons name="edit" size={20} color={Mocha.fg1} />
                    <Text style={styles.menuRowLabel}>Edit</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                </>
              ) : null}
              <Pressable
                style={styles.menuRow}
                onPress={() => confirmDeleteMessage(messageMenu.id)}
                accessibilityRole="button"
                accessibilityLabel="Delete message">
                <MaterialIcons name="delete-outline" size={22} color={Mocha.red} />
                <Text style={[styles.menuRowLabel, styles.menuRowDanger]}>Delete</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={!!editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(null)}>
        <View style={styles.editModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !busy && setEditOpen(null)} />
          <Animated.View entering={FadeIn.duration(200).springify().damping(16)} style={styles.editSheet}>
            <Text style={styles.editTitle}>Edit message</Text>
            <TextInput
              style={styles.editInput}
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              maxLength={2000}
              placeholder="Message"
              placeholderTextColor={Mocha.fg4}
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editCancelBtn} disabled={busy} onPress={() => setEditOpen(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <PressableScale
                style={[styles.editSaveBtn, busy && styles.disabled]}
                disabled={busy || !editDraft.trim()}
                onPress={() => void saveEditedMessage()}>
                <Text style={styles.editSaveText}>Save</Text>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)} />
          <Animated.View entering={FadeIn.duration(260)} style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Chat & group look</Text>
          <Text style={styles.modalHint}>Everyone in the squad sees the same wallpaper and colors.</Text>

          <Text style={styles.fieldLabel}>GIFs</Text>
          <Pressable
            style={styles.modalOutlineBtn}
            disabled={busy}
            onPress={() => {
              setSettingsOpen(false);
              setGiphyOpen(true);
            }}>
            <Text style={styles.modalOutlineText}>Send a GIF from Giphy…</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Group name</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.modalInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Name"
              placeholderTextColor={Mocha.fg4}
            />
            <Pressable style={styles.modalBtn} disabled={busy} onPress={() => void saveGroupName()}>
              <Text style={styles.modalBtnText}>Save</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Group photo</Text>
          <Pressable style={styles.modalOutlineBtn} disabled={busy} onPress={() => void pickAndUploadIcon()}>
            <Text style={styles.modalOutlineText}>Choose from library</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Chat background</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            {BG_PRESETS.map((c) => (
              <Pressable
                key={c}
                style={[styles.presetDot, { backgroundColor: c }, solidBg === c && styles.presetRing]}
                onPress={() => {
                  void (async () => {
                    try {
                      await updateGroupAppearance({ chatBackgroundColor: c, chatWallpaperUrl: null });
                    } catch (e) {
                      notify('Chat', e instanceof Error ? e.message : 'Failed');
                    }
                  })();
                }}
              />
            ))}
          </ScrollView>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.modalInput}
              value={hexDraft}
              onChangeText={setHexDraft}
              placeholder="#121212"
              placeholderTextColor={Mocha.fg4}
              autoCapitalize="characters"
            />
            <Pressable style={styles.modalBtn} disabled={busy} onPress={() => void applyHexColor()}>
              <Text style={styles.modalBtnText}>Apply</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Wallpaper image</Text>
          <Pressable style={styles.modalOutlineBtn} disabled={busy} onPress={() => void pickWallpaper()}>
            <Text style={styles.modalOutlineText}>Pick image</Text>
          </Pressable>
          <Pressable
            style={styles.modalDanger}
            disabled={busy}
            onPress={() => {
              void (async () => {
                try {
                  await updateGroupAppearance({ chatWallpaperUrl: null });
                } catch (e) {
                  notify('Chat', e instanceof Error ? e.message : 'Failed');
                }
              })();
            }}>
            <Text style={styles.modalDangerText}>Remove wallpaper</Text>
          </Pressable>

          <Pressable style={styles.modalClose} onPress={() => setSettingsOpen(false)}>
            <Text style={styles.modalCloseText}>Done</Text>
          </Pressable>
          </Animated.View>
        </View>
      </Modal>
      <Modal visible={groupHubOpen} transparent animationType="slide" onRequestClose={() => setGroupHubOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setGroupHubOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Group hub</Text>
            <Text style={styles.modalHint}>Tap a member to preview their profile.</Text>
            {groupHubBusy ? <ActivityIndicator color={Mocha.fg2} /> : null}
            <View style={styles.memberCircleRow}>
              {memberProfiles.map((m) => (
                <Pressable key={m.uid} style={styles.memberCircleBtn} onPress={() => setSelectedMember(m)}>
                  {m.photoURL ? (
                    <Image source={{ uri: m.photoURL }} style={styles.memberCircleAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.memberCircleAvatar, styles.memberCirclePh]}>
                      <MaterialIcons name="person" size={18} color={Mocha.fg3} />
                    </View>
                  )}
                  <Text style={styles.memberCircleName} numberOfLines={1}>
                    @{m.username ?? m.uid.slice(0, 6)}
                  </Text>
                  <View style={styles.memberTinyEquipRow}>
                    {m.equippedBubbleEffect ? <Text style={styles.memberTinyEquip}>bubble</Text> : null}
                    {m.equippedChatAnimation ? <Text style={styles.memberTinyEquip}>fx</Text> : null}
                    {m.equippedProfileFrame ? <Text style={styles.memberTinyEquip}>frame</Text> : null}
                  </View>
                  {m.equippedBubbleEffect || m.equippedChatAnimation || m.equippedProfileFrame ? (
                    <Text style={styles.memberTinyBy} numberOfLines={1}>
                      equipped by @{m.username ?? m.uid.slice(0, 6)}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
            {selectedMember ? (
              <View style={styles.memberPreview}>
                <Text style={styles.memberPreviewTitle}>
                  {selectedMember.displayName || selectedMember.username || selectedMember.uid}
                </Text>
                <Text style={styles.memberPreviewSub}>
                  @{selectedMember.username ?? selectedMember.uid.slice(0, 6)}
                  {selectedMember.pronouns ? ` · ${selectedMember.pronouns}` : ''}
                </Text>
                {selectedMember.aboutMe ? <Text style={styles.memberPreviewAbout}>{selectedMember.aboutMe}</Text> : null}
                <View style={styles.memberEquipList}>
                  {selectedMember.equippedBubbleEffect ? (
                    <Text style={styles.memberEquipLine}>
                      Equipped bubble: {selectedMember.equippedBubbleEffect} (by @{selectedMember.username ?? selectedMember.uid.slice(0, 6)})
                    </Text>
                  ) : null}
                  {selectedMember.equippedChatAnimation ? (
                    <Text style={styles.memberEquipLine}>
                      Equipped chat FX: {selectedMember.equippedChatAnimation} (by @{selectedMember.username ?? selectedMember.uid.slice(0, 6)})
                    </Text>
                  ) : null}
                  {selectedMember.equippedProfileFrame ? (
                    <Text style={styles.memberEquipLine}>
                      Equipped frame: {selectedMember.equippedProfileFrame} (by @{selectedMember.username ?? selectedMember.uid.slice(0, 6)})
                    </Text>
                  ) : null}
                </View>
                {selectedMember.badges?.length ? (
                  <View style={styles.memberBadgeRow}>
                    {selectedMember.badges.map((b) => (
                      <Text key={b} style={styles.memberBadge}>
                        {b === 'mcfattie' ? 'McFattie Badge' : b}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
      </SafeAreaView>

      <GiphyPicker
        visible={giphyOpen}
        onClose={() => setGiphyOpen(false)}
        onPick={(url) => void sendGiphy(url)}
      />
      {fxBurst ? (
        <View pointerEvents="none" style={styles.fxOverlay}>
          <Text style={styles.fxText}>{fxBurst === 'fireworks' ? '🎆  🎇  🎆' : '🎉  ✨  🎉'}</Text>
        </View>
      ) : null}
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  flex: { flex: 1 },
  muted: { color: Mocha.fg4, padding: 16 },
  emptyWrap: { padding: Space[4], paddingTop: Space[6] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${Mocha.bg3}B3`,
    backgroundColor: 'rgba(15, 15, 20, 0.32)',
    gap: 10,
    overflow: 'hidden',
  },
  headerBlur: { ...StyleSheet.absoluteFillObject },
  headerAvatarTap: { borderRadius: 24, overflow: 'hidden' },
  headerAvatar: { width: 48, height: 48, borderRadius: 24 },
  headerAvatarPh: {
    backgroundColor: Mocha.bg1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  headerTitles: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 17, fontWeight: '700', color: Mocha.fg0 },
  headerSub: { fontSize: 12, color: Mocha.fg4, marginTop: 2 },
  headerGear: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerFx: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Mocha.bg3, backgroundColor: Mocha.bg1 },
  headerFxText: { color: Mocha.yellow, fontSize: 11, fontWeight: '800' },
  threadFill: { flex: 1 },
  flatList: { flex: 1 },
  threadDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  wallpaperImage: { resizeMode: 'cover' },
  listContent: { paddingHorizontal: 12, paddingVertical: 16, gap: 4 },
  rowWrap: { maxWidth: '82%', marginBottom: 6 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  metaName: {
    fontSize: 11,
    fontWeight: '600',
    color: Mocha.fg4,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BUBBLE_OUTLINE,
    backgroundColor: BUBBLE_BG,
  },
  bubbleTextPad: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
  },
  /** GIF + optional caption: no inner padding; bubble hugs the image, caption padded below. */
  bubbleGifShell: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
  },
  bubbleAlignEnd: { alignSelf: 'flex-end' },
  bubbleAlignStart: { alignSelf: 'flex-start' },
  bubbleTheirs: {
    borderBottomLeftRadius: 6,
  },
  bubbleMine: {
    borderBottomRightRadius: 6,
  },
  bubbleNeon: {
    borderColor: '#80d8ff',
    shadowColor: '#80d8ff',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  bubbleSparkle: {
    borderColor: '#f9e2af',
    backgroundColor: 'rgba(60, 51, 33, 0.4)',
  },
  bubbleText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.88)',
  },
  bubbleTextMine: { color: 'rgba(255, 255, 255, 0.9)' },
  composerWrap: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: Mocha.bg0_h,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Mocha.bg3,
    gap: 6,
  },
  composerHint: {
    fontSize: 11,
    color: Mocha.fg4,
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: Mocha.bg1,
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  gifFab: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Mocha.bg2,
  },
  gifFabLabel: { color: Mocha.lavender, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  bubbleGif: {
    width: 220,
    maxWidth: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: 'transparent',
  },
  bubbleCaption: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  composerInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: Mocha.fg0,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Mocha.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendFabOff: { opacity: 0.35 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Mocha.bg1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    gap: 10,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Mocha.rosewater },
  modalHint: { fontSize: 13, color: Mocha.fg3, lineHeight: 18, marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Mocha.fg4, marginTop: 6, textTransform: 'uppercase' },
  nameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  modalInput: {
    flex: 1,
    backgroundColor: Mocha.bg0,
    borderRadius: 12,
    padding: 12,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  modalBtn: {
    backgroundColor: Mocha.blue,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalBtnText: { fontWeight: '800', color: Mocha.fg0 },
  modalOutlineBtn: {
    borderWidth: 1,
    borderColor: Mocha.bg3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalOutlineText: { color: Mocha.fg1, fontWeight: '700' },
  presetsRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  presetDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  presetRing: { borderColor: Mocha.lavender },
  modalDanger: { alignItems: 'center', paddingVertical: 10 },
  modalDangerText: { color: Mocha.red, fontWeight: '700' },
  modalClose: {
    marginTop: 8,
    backgroundColor: Mocha.bg2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCloseText: { fontWeight: '800', color: Mocha.fg0 },
  memberCircleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  memberCircleBtn: { width: 70, alignItems: 'center', gap: 5 },
  memberCircleAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: Mocha.bg2 },
  memberCirclePh: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Mocha.bg3 },
  memberCircleName: { color: Mocha.fg2, fontSize: 10, textAlign: 'center' },
  memberTinyEquipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' },
  memberTinyEquip: {
    fontSize: 8,
    color: Mocha.aqua,
    borderWidth: 1,
    borderColor: `${Mocha.aqua}88`,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  memberTinyBy: { fontSize: 7, color: Mocha.fg4, textAlign: 'center' },
  memberPreview: { marginTop: 12, borderWidth: 1, borderColor: Mocha.bg3, borderRadius: 12, padding: 10, gap: 4, backgroundColor: Mocha.bg0 },
  memberPreviewTitle: { color: Mocha.rosewater, fontWeight: '800', fontSize: 15 },
  memberPreviewSub: { color: Mocha.fg3, fontSize: 12 },
  memberPreviewAbout: { color: Mocha.fg1, fontSize: 13, lineHeight: 18 },
  memberEquipList: { marginTop: 4, gap: 2 },
  memberEquipLine: { color: Mocha.aqua, fontSize: 11, lineHeight: 15 },
  memberBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  memberBadge: { color: Mocha.orange, fontWeight: '700', fontSize: 11, borderWidth: 1, borderColor: `${Mocha.orange}88`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },

  mineBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: '92%',
  },
  messageDotsHit: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeAction: {
    width: 80,
    borderRadius: 12,
    marginVertical: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Mocha.blue}CC`,
    gap: 4,
  },
  swipeActionText: { color: Mocha.fg0, fontSize: 12, fontWeight: '700' },
  menuOverlay: { flex: 1 },
  messageMenuBox: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: Mocha.bg1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: MENU_ROW_HEIGHT,
    paddingHorizontal: 14,
  },
  menuRowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: Mocha.fg0 },
  menuRowDanger: { color: Mocha.red },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Mocha.bg3, marginLeft: 14 },

  editModalRoot: { flex: 1, justifyContent: 'center', padding: 24 },
  editSheet: {
    backgroundColor: Mocha.bg1,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    gap: 12,
    zIndex: 2,
  },
  editTitle: { fontSize: 18, fontWeight: '800', color: Mocha.fg0 },
  editInput: {
    minHeight: 100,
    maxHeight: 200,
    backgroundColor: Mocha.bg0,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
    textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  editCancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  editCancelText: { color: Mocha.fg3, fontWeight: '700', fontSize: 16 },
  editSaveBtn: {
    backgroundColor: Mocha.blue,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editSaveText: { color: Mocha.fg0, fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.45 },
  fxOverlay: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  fxText: { fontSize: 28, letterSpacing: 3 },
});
