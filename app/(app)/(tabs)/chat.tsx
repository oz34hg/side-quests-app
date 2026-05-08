import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { GiphyPicker } from '@/components/giphy-picker';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenEnter } from '@/components/screen-enter';
import { Mocha } from '@/constants/mocha';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';

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

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

const MENU_WIDTH = 200;
const MENU_ROW_HEIGHT = 48;

type MessageMenuAnchor = { id: string; x: number; y: number; w: number; h: number };

export default function ChatScreen() {
  const { user } = useAuth();
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
  const menuAnchorRefs = useRef<Record<string, View | null>>({});

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
    [postMessage, text],
  );

  const closeMessageMenu = useCallback(() => setMessageMenu(null), []);

  const openMessageMenu = useCallback((item: Row) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
        if (Platform.OS === 'web') {
          notify('Copied', 'Message copied to clipboard.');
        }
      } catch (e) {
        notify('Copy', e instanceof Error ? e.message : 'Failed');
      }
    },
    [closeMessageMenu, messageCopyPayload],
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
  }, [editDraft, editOpen, updateChatMessage]);

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
    [closeMessageMenu, deleteChatMessage],
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
    } catch (e) {
      notify('Name', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

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
          <Text style={styles.muted}>Join or create a group first (Group tab).</Text>
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
            <View style={[styles.rowWrap, mine ? styles.rowMine : styles.rowTheirs]}>
              {!mine && item.showMeta ? (
                <Text style={styles.metaName} numberOfLines={1}>
                  {who}
                </Text>
              ) : null}
              {mine ? (
                <View style={styles.mineBubbleRow}>
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleMine,
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
              )}
            </View>
          );
        }}
      />
    </View>
  );

  return (
    <ScreenEnter>
      <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <PressableScale onPress={pickAndUploadIcon} disabled={busy} style={styles.headerAvatarTap}>
          {group?.groupPhotoURL ? (
            <Image source={{ uri: group.groupPhotoURL }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPh]}>
              <MaterialIcons name="group" size={26} color={Mocha.fg3} />
            </View>
          )}
        </PressableScale>
        <View style={styles.headerTitles}>
          <Text style={styles.headerName} numberOfLines={1}>
            {group?.name ?? 'Squad'}
          </Text>
          <Text style={styles.headerSub}>
            {(group?.memberIds?.length ?? 0)} {(group?.memberIds?.length ?? 0) === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <View style={styles.headerActions}>
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

        <View style={styles.composerWrap}>
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
      </SafeAreaView>

      <GiphyPicker
        visible={giphyOpen}
        onClose={() => setGiphyOpen(false)}
        onPick={(url) => void sendGiphy(url)}
      />
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h },
  flex: { flex: 1 },
  muted: { color: Mocha.fg4, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Mocha.bg3,
    backgroundColor: Mocha.bg0_h,
    gap: 10,
  },
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
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
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
});
