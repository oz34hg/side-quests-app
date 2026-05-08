import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { db, isFirebaseConfigured, storage } from '@/lib/firebase';
import {
  addVlogEntry,
  castSideQuestVote,
  createGroup,
  ensureTodayDay,
  joinGroup,
  resetGroupRotation,
  startGroupRotation,
  submitSideQuestProofUrl,
  sendChatMessage,
  purchaseStoreItem as purchaseStoreItemFirestore,
  deleteChatMessage as deleteChatMessageFirestore,
  updateChatMessage as updateChatMessageFirestore,
  subscribeDay,
  subscribeGroup,
  subscribeMembers,
  subscribeMessages,
  subscribeStats,
  subscribeVlogsForDay,
  subscribeVlogsPastSections,
  updateGroupAppearance as updateGroupAppearanceFirestore,
  type ChatMessageDoc,
  type DayDoc,
  type GroupAppearancePatch,
  type GroupDoc,
  type MemberDoc,
  type StatsDoc,
  type VlogPastSection,
  type VlogRow,
} from '@/services/groupFirestore';
import { localDayKey } from '@/utils/dateKey';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function readLocalVideoForUpload(localUri: string): Promise<{
  blob: Blob;
  ext: string;
  contentType: string;
}> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const lower = localUri.toLowerCase();
  const t = blob.type || '';
  if (t.includes('quicktime') || lower.endsWith('.mov')) {
    return { blob, ext: 'mov', contentType: 'video/quicktime' };
  }
  if (t.includes('webm') || lower.endsWith('.webm')) {
    return { blob, ext: 'webm', contentType: 'video/webm' };
  }
  if (t.startsWith('video/')) {
    return { blob, ext: 'mp4', contentType: t };
  }
  return { blob, ext: 'mp4', contentType: 'video/mp4' };
}

/** Pre–per-uid installs only; migrated into {@link ACTIVE_GROUP_BY_UID_KEY} once per user. */
const LEGACY_ACTIVE_GROUP_KEY = '@side_quests/active_group_id';
const ACTIVE_GROUP_BY_UID_KEY = '@side_quests/active_group_by_uid';

type GroupContextValue = {
  activeGroupId: string | null;
  loading: boolean;
  group: GroupDoc | null;
  members: Map<string, MemberDoc>;
  dayKey: string;
  day: DayDoc | null;
  stats: Map<string, StatsDoc>;
  vlogsToday: VlogRow[];
  vlogPastSections: VlogPastSection[];
  messages: { id: string; data: ChatMessageDoc }[];
  setActiveGroup: (id: string | null) => Promise<void>;
  createNewGroup: (name: string) => Promise<string>;
  joinGroupById: (id: string) => Promise<void>;
  startRotation: () => Promise<void>;
  resetRotation: () => Promise<void>;
  submitQuestProof: (localUri: string) => Promise<void>;
  uploadDayVlog: (localUri: string) => Promise<void>;
  voteQuest: (value: 'pass' | 'fail') => Promise<void>;
  postMessage: (text: string, options?: { gifUrl?: string }) => Promise<void>;
  updateChatMessage: (messageId: string, text: string) => Promise<void>;
  deleteChatMessage: (messageId: string) => Promise<void>;
  bumpDayKey: () => void;
  updateGroupAppearance: (patch: GroupAppearancePatch) => Promise<void>;
  uploadGroupChatIcon: (localUri: string) => Promise<void>;
  uploadChatWallpaper: (localUri: string) => Promise<void>;
  purchaseStoreItem: (itemId: string, cost: number, kind: 'bubbleEffect' | 'chatAnimation' | 'profileFrame') => Promise<void>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

function parseUidMap(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as Record<string, string>;
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [members, setMembers] = useState<Map<string, MemberDoc>>(new Map());
  const [dayKey, setDayKey] = useState(localDayKey());
  const [day, setDay] = useState<DayDoc | null>(null);
  const [stats, setStats] = useState<Map<string, StatsDoc>>(new Map());
  const [vlogsToday, setVlogsToday] = useState<VlogRow[]>([]);
  const [vlogPastSections, setVlogPastSections] = useState<VlogPastSection[]>([]);
  const [messages, setMessages] = useState<{ id: string; data: ChatMessageDoc }[]>([]);

  /**
   * Load or migrate the active group for the signed-in user. Signed-out sessions do not clear
   * `activeGroupId` (so returning after sign-in restores the same squad without rewriting storage on logout).
   */
  useEffect(() => {
    let cancelled = false;
    const uid = user?.uid ?? null;

    if (uid === null) {
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_GROUP_BY_UID_KEY);
        let map = parseUidMap(raw);

        let id = map[uid] ?? null;
        if (!id) {
          const legacy = await AsyncStorage.getItem(LEGACY_ACTIVE_GROUP_KEY);
          if (legacy) {
            id = legacy;
            map = { ...map, [uid]: legacy };
            await AsyncStorage.setItem(ACTIVE_GROUP_BY_UID_KEY, JSON.stringify(map));
            await AsyncStorage.removeItem(LEGACY_ACTIVE_GROUP_KEY);
          }
        }
        if (!id && db) {
          const userSnap = await getDoc(doc(db, 'users', uid));
          const cloudId = userSnap.exists() ? (userSnap.data() as { lastActiveGroupId?: unknown }).lastActiveGroupId : null;
          if (typeof cloudId === 'string' && cloudId.trim()) {
            id = cloudId.trim();
            map = { ...map, [uid]: id };
            await AsyncStorage.setItem(ACTIVE_GROUP_BY_UID_KEY, JSON.stringify(map));
          }
        }

        if (!cancelled) {
          setActiveGroupIdState(id);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const setActiveGroup = useCallback(
    async (id: string | null) => {
      setActiveGroupIdState(id);
      const uid = user?.uid;
      if (!uid) return;
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_GROUP_BY_UID_KEY);
        let map = parseUidMap(raw);
        if (id) {
          map = { ...map, [uid]: id };
        } else {
          const next = { ...map };
          delete next[uid];
          map = next;
        }
        await AsyncStorage.setItem(ACTIVE_GROUP_BY_UID_KEY, JSON.stringify(map));
        if (db) {
          await setDoc(doc(db, 'users', uid), { lastActiveGroupId: id ?? null }, { merge: true });
        }
      } catch {
        // UI already reflects `id`; storage may retry on next setActiveGroup.
      }
    },
    [user?.uid],
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !activeGroupId) {
      setGroup(null);
      setMembers(new Map());
      setDay(null);
      setStats(new Map());
      setVlogsToday([]);
      setVlogPastSections([]);
      setMessages([]);
      return;
    }
    const u1 = subscribeGroup(activeGroupId, setGroup);
    const u2 = subscribeMembers(activeGroupId, setMembers);
    const u3 = subscribeDay(activeGroupId, dayKey, setDay);
    const u4 = subscribeStats(activeGroupId, setStats);
    const u5 = subscribeVlogsForDay(activeGroupId, dayKey, setVlogsToday);
    const u6 = subscribeVlogsPastSections(activeGroupId, dayKey, 520, setVlogPastSections);
    const u7 = subscribeMessages(activeGroupId, setMessages);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
    };
  }, [activeGroupId, dayKey]);

  useEffect(() => {
    if (!activeGroupId || !group?.anchorDayKey || (group.memberIds?.length ?? 0) < 2) return;
    void ensureTodayDay(activeGroupId);
  }, [activeGroupId, group?.anchorDayKey, group?.memberIds?.length, dayKey]);

  /** With 2+ members, set rotation anchor and today’s quest automatically (no manual “Start”). */
  useEffect(() => {
    if (!isFirebaseConfigured || !user || !activeGroupId || !group) return;
    const n = group.memberIds?.length ?? 0;
    if (n < 2 || group.anchorDayKey) return;
    let cancelled = false;
    void (async () => {
      try {
        await startGroupRotation(activeGroupId);
        if (!cancelled) await ensureTodayDay(activeGroupId);
      } catch {
        // User can still use “Start rotation” on the Group tab if rules/network fail.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeGroupId, group?.anchorDayKey, group?.memberIds]);

  const createNewGroup = useCallback(
    async (name: string) => {
      if (!user || !profile?.username) throw new Error('Profile not ready.');
      const gid = await createGroup({
        name,
        ownerId: user.uid,
        ownerProfile: {
          username: profile.username,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        },
      });
      await setActiveGroup(gid);
      return gid;
    },
    [user, profile, setActiveGroup],
  );

  const joinGroupById = useCallback(
    async (id: string) => {
      if (!user || !profile?.username) throw new Error('Profile not ready.');
      const trimmed = id.trim();
      if (!trimmed) throw new Error('Enter a group id.');
      await joinGroup(trimmed, user.uid, {
        username: profile.username,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      });
      await setActiveGroup(trimmed);
    },
    [user, profile, setActiveGroup],
  );

  const startRotation = useCallback(async () => {
    if (!activeGroupId) throw new Error('No active group.');
    await startGroupRotation(activeGroupId);
    await ensureTodayDay(activeGroupId);
  }, [activeGroupId]);

  const resetRotation = useCallback(async () => {
    if (!activeGroupId) return;
    await resetGroupRotation(activeGroupId);
  }, [activeGroupId]);

  const submitQuestProof = useCallback(
    async (localUri: string) => {
      if (!activeGroupId || !user || !storage) throw new Error('Not ready.');
      if (!day || day.assigneeUserId !== user.uid) {
        throw new Error('Only the person assigned today’s side quest can submit proof.');
      }
      const { blob, ext, contentType } = await readLocalVideoForUpload(localUri);
      const path = `groups/${activeGroupId}/sideQuestByDay/${dayKey}/${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType });
      const url = await getDownloadURL(storageRef);
      await submitSideQuestProofUrl(activeGroupId, dayKey, user.uid, url);
    },
    [activeGroupId, dayKey, day, user],
  );

  const uploadDayVlog = useCallback(
    async (localUri: string) => {
      if (!activeGroupId || !user || !storage) throw new Error('Not ready.');
      const { blob, ext, contentType } = await readLocalVideoForUpload(localUri);
      const path = `groups/${activeGroupId}/vlogs/${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType });
      const url = await getDownloadURL(storageRef);
      await addVlogEntry(activeGroupId, user.uid, dayKey, url);
    },
    [activeGroupId, dayKey, user],
  );

  const voteQuest = useCallback(
    async (value: 'pass' | 'fail') => {
      if (!activeGroupId || !user) return;
      await castSideQuestVote(activeGroupId, dayKey, user.uid, value);
    },
    [activeGroupId, dayKey, user],
  );

  const postMessage = useCallback(
    async (text: string, options?: { gifUrl?: string }) => {
      if (!activeGroupId || !user) return;
      await sendChatMessage(activeGroupId, user.uid, text, options?.gifUrl ?? null);
    },
    [activeGroupId, user],
  );

  const updateChatMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!activeGroupId || !user) return;
      await updateChatMessageFirestore(activeGroupId, messageId, user.uid, text);
    },
    [activeGroupId, user],
  );

  const deleteChatMessage = useCallback(
    async (messageId: string) => {
      if (!activeGroupId || !user) return;
      await deleteChatMessageFirestore(activeGroupId, messageId, user.uid);
    },
    [activeGroupId, user],
  );

  const updateGroupAppearance = useCallback(
    async (patch: GroupAppearancePatch) => {
      if (!activeGroupId) throw new Error('No active group.');
      await updateGroupAppearanceFirestore(activeGroupId, patch);
    },
    [activeGroupId],
  );

  const uploadGroupChatIcon = useCallback(
    async (localUri: string) => {
      if (!activeGroupId || !storage) throw new Error('Not ready.');
      const response = await fetch(localUri);
      const blob = await response.blob();
      const ext = blob.type?.includes('png') ? 'png' : 'jpg';
      const storageRef = ref(storage, `groups/${activeGroupId}/chat/group-icon.${ext}`);
      await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateGroupAppearanceFirestore(activeGroupId, { groupPhotoURL: url });
    },
    [activeGroupId],
  );

  const uploadChatWallpaper = useCallback(
    async (localUri: string) => {
      if (!activeGroupId || !storage) throw new Error('Not ready.');
      const response = await fetch(localUri);
      const blob = await response.blob();
      const ext = blob.type?.includes('png') ? 'png' : 'jpg';
      const storageRef = ref(storage, `groups/${activeGroupId}/chat/wallpaper.${ext}`);
      await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateGroupAppearanceFirestore(activeGroupId, { chatWallpaperUrl: url });
    },
    [activeGroupId],
  );

  const purchaseStoreItem = useCallback(
    async (itemId: string, cost: number, kind: 'bubbleEffect' | 'chatAnimation' | 'profileFrame') => {
      if (!activeGroupId || !user) throw new Error('Join a group first.');
      await purchaseStoreItemFirestore({
        groupId: activeGroupId,
        userId: user.uid,
        itemId,
        cost,
        kind,
      });
    },
    [activeGroupId, user],
  );

  const bumpDayKey = useCallback(() => {
    setDayKey(localDayKey());
  }, []);

  const loading = !hydrated;

  const value = useMemo<GroupContextValue>(
    () => ({
      activeGroupId,
      loading,
      group,
      members,
      dayKey,
      day,
      stats,
      vlogsToday,
      vlogPastSections,
      messages,
      setActiveGroup,
      createNewGroup,
      joinGroupById,
      startRotation,
      resetRotation,
      submitQuestProof,
      uploadDayVlog,
      voteQuest,
      postMessage,
      updateChatMessage,
      deleteChatMessage,
      bumpDayKey,
      updateGroupAppearance,
      uploadGroupChatIcon,
      uploadChatWallpaper,
      purchaseStoreItem,
    }),
    [
      activeGroupId,
      loading,
      group,
      members,
      dayKey,
      day,
      stats,
      vlogsToday,
      vlogPastSections,
      messages,
      setActiveGroup,
      createNewGroup,
      joinGroupById,
      startRotation,
      resetRotation,
      submitQuestProof,
      uploadDayVlog,
      voteQuest,
      postMessage,
      updateChatMessage,
      deleteChatMessage,
      bumpDayKey,
      updateGroupAppearance,
      uploadGroupChatIcon,
      uploadChatWallpaper,
      purchaseStoreItem,
    ],
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used within GroupProvider');
  return ctx;
}
