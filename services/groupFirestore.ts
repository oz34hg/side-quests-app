import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { isAllowedGiphyUrl } from '@/lib/giphy';
import { questById, questCompletionPoints } from '@/constants/quests';
import { localDayKey, wholeLocalDaysBetween } from '@/utils/dateKey';
import { pickQuestForDay } from '@/utils/questPick';

export type GroupDoc = {
  name: string;
  ownerId: string;
  memberIds: string[];
  anchorDayKey: string | null;
  usedQuestIds: string[];
  createdAt?: unknown;
  /** Group icon shown in chat header */
  groupPhotoURL?: string | null;
  /** Solid chat backdrop (hex), used when no wallpaper */
  chatBackgroundColor?: string | null;
  /** Optional image behind the message list */
  chatWallpaperUrl?: string | null;
};

export type DayDoc = {
  dayKey: string;
  assigneeUserId: string;
  questId: string;
  /** Copied when the day doc is created so the Today card still shows the quest if `quests.ts` changes. */
  questText?: string;
  questTier?: 'easy' | 'medium' | 'hard';
  sideQuestStatus: 'open' | 'skipped' | 'voting' | 'resolved';
  proofVideoUrl: string | null;
  votes: Record<string, 'pass' | 'fail'>;
  resolution: 'passed' | 'failed' | null;
};

export type MemberDoc = {
  username: string;
  displayName: string;
  photoURL: string | null;
  joinedAt?: unknown;
};

export type StatsDoc = {
  messagesSent: number;
  sideQuestsCompleted: number;
  vlogsUploaded: number;
  /** Sum of points from passed side quests (tier-based). */
  questPoints?: number;
};

export type ChatMessageDoc = {
  userId: string;
  text: string;
  /** HTTPS URL on giphy.com — animated GIF */
  gifUrl?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type VlogDoc = {
  userId: string;
  dayKey: string;
  videoUrl: string;
  createdAt?: unknown;
};

export type VlogRow = { id: string; data: VlogDoc };

/** Past days grouped for archive UI (newest calendar day first). */
export type VlogPastSection = { dayKey: string; entries: VlogRow[] };
export type StoreItemKind = 'bubbleEffect' | 'chatAnimation' | 'profileFrame';

function assertDb() {
  if (!db) throw new Error('Firebase is not configured.');
  return db;
}

function isFoodQuest(questText: string | undefined, questId: string): boolean {
  const source = (questText || questById(questId)?.text || '').toLowerCase();
  if (!source) return false;
  return /(food|eat|meal|snack|burger|pizza|taco|drink|restaurant|cook|cooking)/.test(source);
}

export async function createGroup(params: {
  name: string;
  ownerId: string;
  ownerProfile: { username: string; displayName: string; photoURL: string | null };
}): Promise<string> {
  const database = assertDb();
  const ref = doc(collection(database, 'groups'));
  const gid = ref.id;
  const batchDay = localDayKey();
  await setDoc(ref, {
    name: params.name.trim() || 'Squad',
    ownerId: params.ownerId,
    memberIds: [params.ownerId],
    anchorDayKey: null,
    usedQuestIds: [],
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(database, 'groups', gid, 'members', params.ownerId), {
    username: params.ownerProfile.username,
    displayName: params.ownerProfile.displayName,
    photoURL: params.ownerProfile.photoURL,
    joinedAt: serverTimestamp(),
  });
  await setDoc(doc(database, 'groups', gid, 'stats', params.ownerId), {
    messagesSent: 0,
    sideQuestsCompleted: 0,
    vlogsUploaded: 0,
    questPoints: 0,
  });
  return gid;
}

export type GroupAppearancePatch = Partial<{
  name: string;
  groupPhotoURL: string | null;
  chatBackgroundColor: string | null;
  chatWallpaperUrl: string | null;
}>;

export async function updateGroupAppearance(groupId: string, patch: GroupAppearancePatch): Promise<void> {
  const database = assertDb();
  const ref = doc(database, 'groups', groupId);
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;
  if (Object.keys(clean).length === 0) return;
  await updateDoc(ref, clean as GroupAppearancePatch);
}

export async function joinGroup(
  groupId: string,
  uid: string,
  profile: { username: string; displayName: string; photoURL: string | null },
): Promise<void> {
  const database = assertDb();
  const ref = doc(database, 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Group not found.');
  const data = snap.data() as GroupDoc;
  if (data.memberIds?.includes(uid)) return;
  await updateDoc(ref, { memberIds: arrayUnion(uid) });
  await setDoc(doc(database, 'groups', groupId, 'members', uid), {
    username: profile.username,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    joinedAt: serverTimestamp(),
  });
  await setDoc(doc(database, 'groups', groupId, 'stats', uid), {
    messagesSent: 0,
    sideQuestsCompleted: 0,
    vlogsUploaded: 0,
    questPoints: 0,
  });
}

export async function startGroupRotation(groupId: string): Promise<void> {
  const database = assertDb();
  const ref = doc(database, 'groups', groupId);
  const today = localDayKey();
  await updateDoc(ref, { anchorDayKey: today, usedQuestIds: [] });
}

export async function resetGroupRotation(groupId: string): Promise<void> {
  const database = assertDb();
  await updateDoc(doc(database, 'groups', groupId), {
    anchorDayKey: null,
    usedQuestIds: [],
  });
}

/** Creates today's day doc if missing (assignee + quest). */
export async function ensureTodayDay(groupId: string): Promise<void> {
  const database = assertDb();
  const dayKey = localDayKey();
  const groupRef = doc(database, 'groups', groupId);
  const dayRef = doc(database, 'groups', groupId, 'days', dayKey);

  await runTransaction(database, async (tx) => {
    const daySnap = await tx.get(dayRef);
    if (daySnap.exists()) return;

    const gSnap = await tx.get(groupRef);
    const g = gSnap.data() as GroupDoc | undefined;
    if (!g?.memberIds || g.memberIds.length < 2) return;
    if (!g.anchorDayKey) return;

    const anchor = g.anchorDayKey;
    const usedRaw = g.usedQuestIds ?? [];
    const dayIndex = wholeLocalDaysBetween(anchor, dayKey);
    const n = g.memberIds.length;
    const assigneeUserId = g.memberIds[((dayIndex % n) + n) % n];
    // After everyone has been assignee once (same slot as anchor day), start a fresh quest pool round.
    const newRotationRound = dayIndex > 0 && n > 0 && dayIndex % n === 0;
    const usedForPick = newRotationRound ? [] : usedRaw;
    const { questId, questText, questTier, nextUsed } = pickQuestForDay(
      dayKey,
      assigneeUserId,
      new Set(usedForPick),
    );

    tx.set(dayRef, {
      dayKey,
      assigneeUserId,
      questId,
      questText,
      questTier,
      sideQuestStatus: 'open',
      proofVideoUrl: null,
      votes: {},
      resolution: null,
      createdAt: serverTimestamp(),
    });

    tx.update(groupRef, { usedQuestIds: nextUsed });
  });
}

export async function submitSideQuestProofUrl(
  groupId: string,
  dayKey: string,
  uid: string,
  downloadUrl: string,
): Promise<void> {
  const database = assertDb();
  const dayRef = doc(database, 'groups', groupId, 'days', dayKey);
  const snap = await getDoc(dayRef);
  const d = snap.data() as DayDoc | undefined;
  if (!d || d.assigneeUserId !== uid) throw new Error('Only the assignee can submit proof.');
  if (d.sideQuestStatus !== 'open') throw new Error('Cannot submit proof now.');
  await updateDoc(dayRef, {
    proofVideoUrl: downloadUrl,
    sideQuestStatus: 'voting',
    votes: {},
  });
}

export async function castSideQuestVote(
  groupId: string,
  dayKey: string,
  voterId: string,
  value: 'pass' | 'fail',
): Promise<void> {
  const database = assertDb();
  const groupRef = doc(database, 'groups', groupId);
  const dayRef = doc(database, 'groups', groupId, 'days', dayKey);

  await runTransaction(database, async (tx) => {
    const [gSnap, dSnap] = await Promise.all([tx.get(groupRef), tx.get(dayRef)]);
    const g = gSnap.data() as GroupDoc | undefined;
    const d = dSnap.data() as DayDoc | undefined;
    if (!g || !d) throw new Error('Missing data.');
    if (d.sideQuestStatus !== 'voting') throw new Error('Not voting.');
    if (d.assigneeUserId === voterId) throw new Error('Assignee cannot vote.');
    if (!g.memberIds.includes(voterId)) throw new Error('Not a member.');

    const votes = { ...(d.votes ?? {}), [voterId]: value };
    const voters = g.memberIds.filter((id) => id !== d.assigneeUserId);
    const allVoted = voters.length > 0 && voters.every((id) => votes[id] === 'pass' || votes[id] === 'fail');

    let resolution: 'passed' | 'failed' | null = null;
    if (allVoted) {
      let pass = 0;
      let fail = 0;
      for (const id of voters) {
        if (votes[id] === 'pass') pass += 1;
        else fail += 1;
      }
      resolution = pass > fail ? 'passed' : 'failed';
    }

    tx.update(dayRef, {
      votes,
      ...(allVoted
        ? { sideQuestStatus: 'resolved', resolution }
        : {}),
    });

    if (allVoted && resolution === 'passed') {
      const statRef = doc(database, 'groups', groupId, 'stats', d.assigneeUserId);
      const tier = d.questTier ?? questById(d.questId)?.tier ?? null;
      const pts = questCompletionPoints(tier);
      tx.update(statRef, {
        sideQuestsCompleted: increment(1),
        questPoints: increment(pts),
      });
      if (isFoodQuest(d.questText, d.questId)) {
        const userRef = doc(database, 'users', d.assigneeUserId);
        tx.set(userRef, { badges: arrayUnion('mcfattie') }, { merge: true });
      }
    }
  });
}

export async function sendChatMessage(
  groupId: string,
  userId: string,
  text: string,
  gifUrl?: string | null,
): Promise<void> {
  const database = assertDb();
  const trimmed = text.trim();
  const gif = gifUrl?.trim() ?? '';
  if (!trimmed && !gif) return;
  if (gif) {
    if (!isAllowedGiphyUrl(gif)) throw new Error('Only Giphy GIF links are allowed.');
  }
  const msgRef = doc(collection(database, 'groups', groupId, 'messages'));
  const statRef = doc(database, 'groups', groupId, 'stats', userId);
  const batch = writeBatch(database);
  const payload: Record<string, unknown> = {
    userId,
    text: trimmed,
    createdAt: serverTimestamp(),
  };
  if (gif) payload.gifUrl = gif;
  batch.set(msgRef, payload);
  batch.set(statRef, { messagesSent: increment(1) }, { merge: true });
  await batch.commit();
}

export async function updateChatMessage(
  groupId: string,
  messageId: string,
  userId: string,
  text: string,
): Promise<void> {
  const database = assertDb();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  const msgRef = doc(database, 'groups', groupId, 'messages', messageId);
  const msgSnap = await getDoc(msgRef);
  if (!msgSnap.exists()) return;
  const data = msgSnap.data() as ChatMessageDoc;
  if (data.userId !== userId) throw new Error('Not your message.');
  await updateDoc(msgRef, { text: trimmed, updatedAt: serverTimestamp() });
}

export async function deleteChatMessage(
  groupId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  const database = assertDb();
  const msgRef = doc(database, 'groups', groupId, 'messages', messageId);
  const msgSnap = await getDoc(msgRef);
  if (!msgSnap.exists()) return;
  const data = msgSnap.data() as ChatMessageDoc;
  if (data.userId !== userId) throw new Error('Not your message.');
  const batch = writeBatch(database);
  batch.delete(msgRef);
  const statRef = doc(database, 'groups', groupId, 'stats', userId);
  batch.set(statRef, { messagesSent: increment(-1) }, { merge: true });
  await batch.commit();
}

export async function addVlogEntry(
  groupId: string,
  userId: string,
  dayKey: string,
  videoUrl: string,
): Promise<void> {
  const database = assertDb();
  const vlogRef = doc(collection(database, 'groups', groupId, 'vlogs'));
  const statRef = doc(database, 'groups', groupId, 'stats', userId);
  const batch = writeBatch(database);
  batch.set(vlogRef, {
    userId,
    dayKey,
    videoUrl,
    createdAt: serverTimestamp(),
  });
  batch.set(statRef, { vlogsUploaded: increment(1) }, { merge: true });
  await batch.commit();
}

export async function purchaseStoreItem(params: {
  groupId: string;
  userId: string;
  itemId: string;
  cost: number;
  kind: StoreItemKind;
}): Promise<void> {
  const database = assertDb();
  const statRef = doc(database, 'groups', params.groupId, 'stats', params.userId);
  const userRef = doc(database, 'users', params.userId);
  await runTransaction(database, async (tx) => {
    const [statSnap, userSnap] = await Promise.all([tx.get(statRef), tx.get(userRef)]);
    const points = statSnap.exists() ? ((statSnap.data() as StatsDoc).questPoints ?? 0) : 0;
    if (points < params.cost) throw new Error('Not enough quest points.');
    const userData = userSnap.exists()
      ? (userSnap.data() as {
          ownedStoreItems?: string[];
        })
      : {};
    const owned = userData.ownedStoreItems ?? [];
    if (owned.includes(params.itemId)) return;
    tx.set(statRef, { questPoints: increment(-params.cost) }, { merge: true });
    tx.set(
      userRef,
      {
        ownedStoreItems: arrayUnion(params.itemId),
      },
      { merge: true },
    );
  });
}

export function subscribeGroup(
  groupId: string,
  onData: (g: GroupDoc | null) => void,
): Unsubscribe {
  const database = assertDb();
  return onSnapshot(doc(database, 'groups', groupId), (snap) => {
    onData(snap.exists() ? (snap.data() as GroupDoc) : null);
  });
}

export function subscribeMembers(
  groupId: string,
  onData: (m: Map<string, MemberDoc>) => void,
): Unsubscribe {
  const database = assertDb();
  const col = collection(database, 'groups', groupId, 'members');
  return onSnapshot(col, (snap) => {
    const map = new Map<string, MemberDoc>();
    snap.forEach((d) => map.set(d.id, d.data() as MemberDoc));
    onData(map);
  });
}

export function subscribeDay(
  groupId: string,
  dayKey: string,
  onData: (d: DayDoc | null) => void,
): Unsubscribe {
  const database = assertDb();
  return onSnapshot(doc(database, 'groups', groupId, 'days', dayKey), (snap) => {
    onData(snap.exists() ? (snap.data() as DayDoc) : null);
  });
}

export function subscribeStats(
  groupId: string,
  onData: (m: Map<string, StatsDoc>) => void,
): Unsubscribe {
  const database = assertDb();
  return onSnapshot(collection(database, 'groups', groupId, 'stats'), (snap) => {
    const map = new Map<string, StatsDoc>();
    snap.forEach((d) => map.set(d.id, d.data() as StatsDoc));
    onData(map);
  });
}

export function subscribeMessages(
  groupId: string,
  onData: (rows: { id: string; data: ChatMessageDoc }[]) => void,
): Unsubscribe {
  const database = assertDb();
  const q = query(
    collection(database, 'groups', groupId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(80),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as ChatMessageDoc }));
    onData(rows);
  });
}

/** All vlog clips for a single calendar day (not capped by unrelated recent uploads). */
export function subscribeVlogsForDay(
  groupId: string,
  dayKey: string,
  onData: (rows: VlogRow[]) => void,
): Unsubscribe {
  const database = assertDb();
  const q = query(
    collection(database, 'groups', groupId, 'vlogs'),
    where('dayKey', '==', dayKey),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, data: d.data() as VlogDoc })));
  });
}

/**
 * Recent vlogs across the group, grouped by calendar day (excluding `todayDayKey`).
 * Uses a single `createdAt` query so older days may be omitted if the group has a very large backlog.
 */
export function subscribeVlogsPastSections(
  groupId: string,
  todayDayKey: string,
  recentLimit: number,
  onData: (sections: VlogPastSection[]) => void,
): Unsubscribe {
  const database = assertDb();
  const q = query(
    collection(database, 'groups', groupId, 'vlogs'),
    orderBy('createdAt', 'desc'),
    limit(recentLimit),
  );
  return onSnapshot(q, (snap) => {
    const rows: VlogRow[] = snap.docs.map((d) => ({ id: d.id, data: d.data() as VlogDoc }));
    const past = rows.filter((r) => r.data.dayKey && r.data.dayKey !== todayDayKey);
    const map = new Map<string, VlogRow[]>();
    for (const r of past) {
      const dk = r.data.dayKey;
      const cur = map.get(dk);
      if (cur) cur.push(r);
      else map.set(dk, [r]);
    }
    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    onData(keys.map((k) => ({ dayKey: k, entries: map.get(k)! })));
  });
}
