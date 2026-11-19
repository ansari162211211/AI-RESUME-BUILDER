export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  measurementId?: string;
}

export interface ResolvedFirebaseConfig {
  config: FirebaseClientConfig | null;
  source: 'env' | 'applet-fallback' | 'missing';
  error: string | null;
  missingEnvKeys: string[];
}

export type AppViewMode =
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'editor'
  | 'preview'
  | 'templates'
  | 'ats-analyzer';

const REQUIRED_VITE_FIREBASE_KEYS = [
  { envKey: 'VITE_FIREBASE_API_KEY', configKey: 'apiKey' },
  { envKey: 'VITE_FIREBASE_AUTH_DOMAIN', configKey: 'authDomain' },
  { envKey: 'VITE_FIREBASE_PROJECT_ID', configKey: 'projectId' },
  { envKey: 'VITE_FIREBASE_STORAGE_BUCKET', configKey: 'storageBucket' },
  { envKey: 'VITE_FIREBASE_MESSAGING_SENDER_ID', configKey: 'messagingSenderId' },
  { envKey: 'VITE_FIREBASE_APP_ID', configKey: 'appId' },
] as const;

function cleanString(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function isCompleteConfig(
  candidate: Partial<FirebaseClientConfig> | null | undefined
): candidate is FirebaseClientConfig {
  if (!candidate) return false;
  return Boolean(
    cleanString(candidate.apiKey) &&
      cleanString(candidate.authDomain) &&
      cleanString(candidate.projectId) &&
      cleanString(candidate.storageBucket) &&
      cleanString(candidate.messagingSenderId) &&
      cleanString(candidate.appId)
  );
}

/**
 * Determines whether the current hostname is an AI Studio or local development runtime
 * where `firebase-applet-config.json` may act as an automatic fallback when VITE_FIREBASE_*
 * env vars are not injected.
 */
export function isLocalOrAiStudioHost(hostname?: string): boolean {
  const host = cleanString(hostname).toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return true;
  }
  return host.endsWith('.run.app');
}

/**
 * Resolves Firebase client configuration from standard Vite environment variables
 * (`VITE_FIREBASE_*`) first, falling back to `firebase-applet-config.json` only on
 * local/AI Studio runtimes when no VITE_FIREBASE_* overrides are configured.
 */
export function resolveFirebaseConfig(
  env: Record<string, unknown> = {},
  fallbackConfig?: Partial<FirebaseClientConfig> | null,
  runtimeHostname?: string
): ResolvedFirebaseConfig {
  const apiKey = cleanString(env.VITE_FIREBASE_API_KEY);
  const authDomain = cleanString(env.VITE_FIREBASE_AUTH_DOMAIN);
  const projectId = cleanString(env.VITE_FIREBASE_PROJECT_ID);
  const storageBucket = cleanString(env.VITE_FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = cleanString(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
  const appId = cleanString(env.VITE_FIREBASE_APP_ID);
  const explicitDbId = cleanString(env.VITE_FIREBASE_FIRESTORE_DATABASE_ID);
  const measurementId = cleanString(env.VITE_FIREBASE_MEASUREMENT_ID);

  const envValues: Record<string, string> = {
    VITE_FIREBASE_API_KEY: apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: authDomain,
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_STORAGE_BUCKET: storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
    VITE_FIREBASE_APP_ID: appId,
  };

  const anyEnvProvided = REQUIRED_VITE_FIREBASE_KEYS.some(
    ({ envKey }) => envValues[envKey].length > 0
  );

  if (anyEnvProvided) {
    const missingEnvKeys = REQUIRED_VITE_FIREBASE_KEYS.filter(
      ({ envKey }) => !envValues[envKey]
    ).map(({ envKey }) => envKey);

    if (missingEnvKeys.length > 0) {
      return {
        config: null,
        source: 'missing',
        missingEnvKeys,
        error: `Firebase is partially configured. Missing environment variables: ${missingEnvKeys.join(
          ', '
        )}.`,
      };
    }

    const fallbackDbId = cleanString(fallbackConfig?.firestoreDatabaseId);
    const sameProjectAsApplet =
      Boolean(fallbackConfig?.projectId) && projectId === cleanString(fallbackConfig?.projectId);

    const firestoreDatabaseId = explicitDbId || (sameProjectAsApplet && fallbackDbId ? fallbackDbId : undefined);

    return {
      config: {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
        ...(firestoreDatabaseId ? { firestoreDatabaseId } : {}),
        ...(measurementId ? { measurementId } : {}),
      },
      source: 'env',
      missingEnvKeys: [],
      error: null,
    };
  }

  // No VITE_FIREBASE_* env vars provided: allow AI Studio / local workspace fallback
  if (isLocalOrAiStudioHost(runtimeHostname) && isCompleteConfig(fallbackConfig)) {
    const dbId = explicitDbId || cleanString(fallbackConfig.firestoreDatabaseId);
    return {
      config: {
        apiKey: cleanString(fallbackConfig.apiKey),
        authDomain: cleanString(fallbackConfig.authDomain),
        projectId: cleanString(fallbackConfig.projectId),
        storageBucket: cleanString(fallbackConfig.storageBucket),
        messagingSenderId: cleanString(fallbackConfig.messagingSenderId),
        appId: cleanString(fallbackConfig.appId),
        ...(dbId ? { firestoreDatabaseId: dbId } : {}),
      },
      source: 'applet-fallback',
      missingEnvKeys: [],
      error: null,
    };
  }

  const allMissing = REQUIRED_VITE_FIREBASE_KEYS.map(({ envKey }) => envKey);
  return {
    config: null,
    source: 'missing',
    missingEnvKeys: allMissing,
    error:
      'Firebase configuration is missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID in your deployment environment variables.',
  };
}

/**
 * Maps browser URL paths to internal application views.
 */
export function pathToView(pathname: string): AppViewMode | null {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/':
      return null;
    case '/login':
      return 'login';
    case '/signup':
      return 'signup';
    case '/dashboard':
      return 'dashboard';
    case '/templates':
      return 'templates';
    case '/resume-checker':
    case '/ats-analyzer':
      return 'ats-analyzer';
    case '/editor':
      return 'editor';
    case '/preview':
      return 'preview';
    default:
      return null;
  }
}

/**
 * Maps internal application views to clean browser URL paths.
 */
export function viewToPath(view: AppViewMode): string {
  switch (view) {
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'dashboard':
      return '/dashboard';
    case 'templates':
      return '/templates';
    case 'ats-analyzer':
      return '/resume-checker';
    case 'editor':
      return '/editor';
    case 'preview':
      return '/preview';
    default:
      return '/dashboard';
  }
}

/**
 * Enforces route protection rules cleanly without redirect loops:
 * - Unauthenticated users requesting any protected view are routed to `'login'` (or `'signup'`).
 * - Authenticated users on `'login'`, `'signup'`, or `'/'` are routed to `'dashboard'`.
 * - `'editor'` and `'preview'` require an active resume in memory; otherwise redirect to `'dashboard'`.
 */
export function resolveProtectedView(params: {
  requestedView: AppViewMode | null;
  isAuthenticated: boolean;
  hasActiveResume: boolean;
}): AppViewMode {
  const { requestedView, isAuthenticated, hasActiveResume } = params;

  if (!isAuthenticated) {
    return requestedView === 'signup' ? 'signup' : 'login';
  }

  if (!requestedView || requestedView === 'login' || requestedView === 'signup') {
    return 'dashboard';
  }

  if ((requestedView === 'editor' || requestedView === 'preview') && !hasActiveResume) {
    return 'dashboard';
  }

  return requestedView;
}

/**
 * Extracts Firebase error code cleanly from FirebaseError or serialized error objects.
 */
export function extractErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') return code.trim();
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string') {
    const match = message.match(/\(([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)\)/);
    if (match) return match[1];
  }
  return '';
}

/**
 * Converts Firebase Authentication errors into clear, non-technical messages for end users.
 */
export function mapFirebaseAuthError(error: unknown, runtimeHost?: string): string {
  const code = extractErrorCode(error);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please check your details and try again.';
    case 'auth/weak-password':
      return 'Your password is too weak. Please choose a password with at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Unable to reach the sign-in service. Please check your internet connection and try again.';
    case 'auth/unauthorized-domain': {
      const hostLabel = cleanString(runtimeHost) ? ` (${cleanString(runtimeHost)})` : '';
      return `Sign-in is not yet enabled for this website domain${hostLabel}. Add this domain to Authorized domains in Firebase Authentication settings, or use the Demo Account below.`;
    }
    case 'auth/popup-blocked':
      return 'The Google sign-in window was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled before completion. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes or reset your password before trying again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled in Firebase Authentication settings.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support for assistance.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign back in before making this change.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
    case 'auth/configuration-not-found':
      return 'Authentication is not configured properly for this deployment. Please verify your Firebase environment variables.';
    default: {
      const rawMessage = error instanceof Error ? error.message : String(error || '');
      if (rawMessage.toLowerCase().includes('network')) {
        return 'Network error while connecting to the sign-in service. Please check your connection and try again.';
      }
      return 'We could not complete your request right now. Please verify your details and try again.';
    }
  }
}

/**
 * Converts Firestore errors (including structured FirestoreErrorInfo payloads) into friendly UI copy.
 */
export function mapFirestoreError(
  error: unknown,
  fallbackMessage = 'Could not sync with cloud storage right now. Your changes are kept safely in this browser.'
): string {
  const code = extractErrorCode(error).toLowerCase();
  let rawMessage = error instanceof Error ? error.message : String(error || '');

  // Unwrap serialized FirestoreErrorInfo if thrown by handleFirestoreError
  if (rawMessage.startsWith('{') && rawMessage.includes('"operationType"')) {
    try {
      const parsed = JSON.parse(rawMessage) as { error?: string };
      if (typeof parsed.error === 'string') {
        rawMessage = parsed.error;
      }
    } catch {
      // Ignore JSON parse failure
    }
  }

  const lower = rawMessage.toLowerCase();
  if (
    code === 'permission-denied' ||
    lower.includes('permission-denied') ||
    lower.includes('missing or insufficient permissions')
  ) {
    return 'You do not have permission to access this data. Please sign in again or verify your account permissions.';
  }
  if (code === 'unauthenticated' || lower.includes('unauthenticated')) {
    return 'Your sign-in session expired. Please sign in again to save to your account.';
  }
  if (
    code === 'unavailable' ||
    lower.includes('client is offline') ||
    lower.includes('network') ||
    lower.includes('failed to fetch')
  ) {
    return 'You appear to be offline or cloud storage is temporarily unreachable. Please check your connection and try again.';
  }
  if (code === 'not-found' || lower.includes('not-found')) {
    return 'This item could not be found. It may have been removed or moved.';
  }
  if (code === 'resource-exhausted' || lower.includes('quota')) {
    return 'Storage service is temporarily busy. Please try again in a moment.';
  }
  return fallbackMessage;
}

/**
 * Safely formats any caught error into clean, non-technical text for UI alerts.
 */
export function mapUserFacingError(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.'
): string {
  const authCode = extractErrorCode(error);
  if (authCode.startsWith('auth/')) {
    return mapFirebaseAuthError(error);
  }
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  if (!rawMessage) return fallbackMessage;
  if (rawMessage.startsWith('{') || rawMessage.includes('FirebaseError:')) {
    return mapFirestoreError(error, fallbackMessage);
  }
  if (rawMessage.toLowerCase().includes('failed to fetch')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  return rawMessage;
}
