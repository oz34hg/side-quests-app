import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebaseAuth, db, isFirebaseConfigured, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export type UserProfile = {
  username: string;
  displayName: string;
  photoURL: string | null;
};

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  profile: UserProfile | null;
  needsUsername: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, username: string) => Promise<void>;
  claimUsername: (username: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  uploadProfilePhoto: (localUri: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUsername(u: string) {
  return u.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function assertAuthDb() {
  if (!firebaseAuth || !db) throw new Error('Firebase is not configured. Add EXPO_PUBLIC_* keys.');
}

async function loadProfile(uid: string): Promise<UserProfile | null> {
  assertAuthDb();
  const snap = await getDoc(doc(db!, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isFirebaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!firebaseAuth?.currentUser) {
      setProfile(null);
      return;
    }
    const p = await loadProfile(firebaseAuth.currentUser.uid);
    setProfile(p);
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setReady(true);
      return;
    }
    const unsub = firebaseAuth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u && db) {
        let p = await loadProfile(u.uid);
        if (!p) {
          // Omit `username` so email sign-up's transaction can set it without merge races.
          await setDoc(
            doc(db, 'users', u.uid),
            {
              displayName: u.displayName || 'Player',
              photoURL: u.photoURL ?? null,
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
          p = await loadProfile(u.uid);
        }
        setProfile(p);
      } else {
        setProfile(null);
      }
      setReady(true);
    });
    return unsub;
  }, []);

  const needsUsername = Boolean(
    user && (!profile?.username || String(profile.username).trim().length < 3),
  );

  const signInEmail = useCallback(async (email: string, password: string) => {
    assertAuthDb();
    await signInWithEmailAndPassword(firebaseAuth!, email.trim(), password);
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string, username: string) => {
    assertAuthDb();
    const nu = normalizeUsername(username);
    if (nu.length < 3 || nu.length > 20) throw new Error('Username must be 3–20 characters (letters, numbers, _).');

    const cred = await createUserWithEmailAndPassword(firebaseAuth!, email.trim(), password);
    const uid = cred.user.uid;

    await runTransaction(db!, async (tx) => {
      const unRef = doc(db!, 'usernames', nu);
      const uRef = doc(db!, 'users', uid);
      const unSnap = await tx.get(unRef);
      if (unSnap.exists()) throw new Error('Username is already taken.');
      tx.set(unRef, { uid });
      tx.set(uRef, {
        username: nu,
        displayName: nu,
        photoURL: null,
        createdAt: serverTimestamp(),
      });
    });

    await updateProfile(cred.user, { displayName: nu });
    setProfile({
      username: nu,
      displayName: nu,
      photoURL: cred.user.photoURL ?? null,
    });
    await refreshProfile();
  }, [refreshProfile]);

  const claimUsername = useCallback(
    async (username: string) => {
      assertAuthDb();
      const cur = firebaseAuth!.currentUser;
      if (!cur) throw new Error('Not signed in.');
      const nu = normalizeUsername(username);
      if (nu.length < 3 || nu.length > 20) throw new Error('Username must be 3–20 characters (letters, numbers, _).');

      await runTransaction(db!, async (tx) => {
        const unRef = doc(db!, 'usernames', nu);
        const uRef = doc(db!, 'users', cur.uid);
        const unSnap = await tx.get(unRef);
        const prev = await tx.get(uRef);
        if (unSnap.exists() && unSnap.data()?.uid !== cur.uid) {
          throw new Error('Username is already taken.');
        }
        const prevUsername = prev.exists() ? (prev.data() as UserProfile).username : null;
        if (prevUsername && String(prevUsername).trim().length >= 2 && prevUsername !== nu) {
          tx.delete(doc(db!, 'usernames', prevUsername));
        }
        if (!unSnap.exists()) {
          tx.set(unRef, { uid: cur.uid });
        }
        tx.set(
          uRef,
          {
            username: nu,
            displayName: cur.displayName || nu,
            photoURL: cur.photoURL ?? null,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
      await updateProfile(cur, { displayName: cur.displayName || nu });
      setProfile({
        username: nu,
        displayName: cur.displayName || nu,
        photoURL: cur.photoURL ?? null,
      });
      await refreshProfile();
    },
    [refreshProfile],
  );

  const updateDisplayName = useCallback(
    async (name: string) => {
      assertAuthDb();
      const cur = firebaseAuth!.currentUser;
      if (!cur) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      await updateProfile(cur, { displayName: trimmed });
      await setDoc(
        doc(db!, 'users', cur.uid),
        { displayName: trimmed },
        { merge: true },
      );
      await refreshProfile();
    },
    [refreshProfile],
  );

  const uploadProfilePhoto = useCallback(
    async (localUri: string) => {
      assertAuthDb();
      if (!storage) throw new Error('Storage not configured.');
      const cur = firebaseAuth!.currentUser;
      if (!cur) throw new Error('Not signed in.');

      const response = await fetch(localUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${cur.uid}/profile.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateProfile(cur, { photoURL: url });
      await setDoc(doc(db!, 'users', cur.uid), { photoURL: url }, { merge: true });
      await refreshProfile();
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
    if (!firebaseAuth) return;
    await firebaseSignOut(firebaseAuth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      profile,
      needsUsername,
      signInEmail,
      signUpEmail,
      claimUsername,
      updateDisplayName,
      uploadProfilePhoto,
      signOut,
      refreshProfile,
    }),
    [
      ready,
      user,
      profile,
      needsUsername,
      signInEmail,
      signUpEmail,
      claimUsername,
      updateDisplayName,
      uploadProfilePhoto,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
