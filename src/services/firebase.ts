import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Firestore,
} from 'firebase/firestore';
import appletFallbackConfig from '../../firebase-applet-config.json';
import { resolveFirebaseConfig } from '../utils/firebaseHelpers';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const runtimeHostname =
  typeof window !== 'undefined' ? window.location.hostname : undefined;

const resolved = resolveFirebaseConfig(
  import.meta.env as Record<string, unknown>,
  appletFallbackConfig,
  runtimeHostname
);

export const firebaseConfigError: string | null = resolved.error;
export const missingFirebaseEnvKeys: string[] = resolved.missingEnvKeys;
export const isFirebaseConfigured: boolean = Boolean(resolved.config);
export const resolvedFirebaseOptions = resolved.config;

let app: FirebaseApp | null = null;
let initializedDb: Firestore | null = null;
let initializedAuth: Auth | null = null;
let initError: string | null = resolved.error;

if (resolved.config) {
  try {
    app = !getApps().length ? initializeApp(resolved.config) : getApps()[0];
    initializedDb = resolved.config.firestoreDatabaseId
      ? getFirestore(app, resolved.config.firestoreDatabaseId)
      : getFirestore(app);
    initializedAuth = getAuth(app);
    setPersistence(initializedAuth, browserLocalPersistence).catch((err) => {
      console.warn('Could not enforce local browser auth persistence:', err);
    });
  } catch (err: unknown) {
    initError =
      err instanceof Error
        ? err.message
        : 'Unable to initialize Firebase client services.';
    console.error('Firebase initialization error:', err);
  }
} else {
  console.warn('[Firebase]', resolved.error);
}

export const firebaseInitError: string | null = initError;
export const db = initializedDb as Firestore;
export const auth = initializedAuth as Auth;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = initializedAuth?.currentUser || null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Verify connection on boot when Firebase is configured
export async function testConnection(): Promise<boolean> {
  if (!isFirebaseConfigured || !initializedDb) {
    return false;
  }
  try {
    await getDocFromServer(doc(initializedDb, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or configuration pending.');
    }
    return false;
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
};
export type { FirebaseUser };
