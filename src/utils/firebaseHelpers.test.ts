import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLocalOrAiStudioHost,
  mapFirebaseAuthError,
  mapFirestoreError,
  mapUserFacingError,
  pathToView,
  resolveFirebaseConfig,
  resolveProtectedView,
  viewToPath,
} from './firebaseHelpers.ts';

const SAMPLE_APPLET_CONFIG = {
  apiKey: 'test-applet-key',
  authDomain: 'applet-project.firebaseapp.com',
  projectId: 'applet-project',
  storageBucket: 'applet-project.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef',
  firestoreDatabaseId: 'custom-named-db',
};

test('resolveFirebaseConfig uses complete VITE_FIREBASE_* environment variables', () => {
  const result = resolveFirebaseConfig(
    {
      VITE_FIREBASE_API_KEY: 'prod-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'prod.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'prod-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'prod-project.firebasestorage.app',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '999888777',
      VITE_FIREBASE_APP_ID: '1:999888777:web:prod123',
    },
    SAMPLE_APPLET_CONFIG,
    'resume-builder.vercel.app'
  );

  assert.equal(result.source, 'env');
  assert.equal(result.error, null);
  assert.deepEqual(result.missingEnvKeys, []);
  assert.equal(result.config?.projectId, 'prod-project');
  // New project uses default Firestore DB unless VITE_FIREBASE_FIRESTORE_DATABASE_ID is set
  assert.equal(result.config?.firestoreDatabaseId, undefined);
});

test('resolveFirebaseConfig retains named Firestore database ID when env matches applet projectId', () => {
  const result = resolveFirebaseConfig(
    {
      VITE_FIREBASE_API_KEY: 'prod-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'applet-project.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'applet-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'applet-project.firebasestorage.app',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef',
    },
    SAMPLE_APPLET_CONFIG,
    'resume-builder.vercel.app'
  );

  assert.equal(result.source, 'env');
  assert.equal(result.config?.firestoreDatabaseId, 'custom-named-db');
});

test('resolveFirebaseConfig fails clearly when partial VITE_FIREBASE_* env vars are provided', () => {
  const result = resolveFirebaseConfig(
    {
      VITE_FIREBASE_API_KEY: 'partial-key',
      VITE_FIREBASE_PROJECT_ID: 'partial-project',
    },
    SAMPLE_APPLET_CONFIG,
    'localhost'
  );

  assert.equal(result.source, 'missing');
  assert.equal(result.config, null);
  assert.ok(result.missingEnvKeys.includes('VITE_FIREBASE_AUTH_DOMAIN'));
  assert.ok(result.missingEnvKeys.includes('VITE_FIREBASE_APP_ID'));
  assert.match(result.error || '', /Missing environment variables/i);
});

test('resolveFirebaseConfig requires env vars on Vercel production hosts', () => {
  const result = resolveFirebaseConfig(
    {},
    SAMPLE_APPLET_CONFIG,
    'my-resume-app.vercel.app'
  );

  assert.equal(result.source, 'missing');
  assert.equal(result.config, null);
  assert.equal(result.missingEnvKeys.length, 6);
  assert.match(result.error || '', /Firebase configuration is missing/i);
});

test('resolveFirebaseConfig supports AI Studio / localhost fallback when env vars are unset', () => {
  assert.equal(isLocalOrAiStudioHost('localhost'), true);
  assert.equal(isLocalOrAiStudioHost('ais-dev-demo.asia-southeast1.run.app'), true);
  assert.equal(isLocalOrAiStudioHost('my-app.vercel.app'), false);

  const result = resolveFirebaseConfig({}, SAMPLE_APPLET_CONFIG, 'localhost');
  assert.equal(result.source, 'applet-fallback');
  assert.equal(result.error, null);
  assert.equal(result.config?.projectId, 'applet-project');
});

test('pathToView and viewToPath map application routes cleanly', () => {
  assert.equal(pathToView('/'), null);
  assert.equal(pathToView('/login'), 'login');
  assert.equal(pathToView('/signup/'), 'signup');
  assert.equal(pathToView('/dashboard'), 'dashboard');
  assert.equal(pathToView('/templates'), 'templates');
  assert.equal(pathToView('/resume-checker'), 'ats-analyzer');
  assert.equal(pathToView('/ats-analyzer'), 'ats-analyzer');
  assert.equal(pathToView('/editor'), 'editor');
  assert.equal(pathToView('/preview'), 'preview');
  assert.equal(pathToView('/nonexistent'), null);

  assert.equal(viewToPath('ats-analyzer'), '/resume-checker');
  assert.equal(viewToPath('dashboard'), '/dashboard');
  assert.equal(viewToPath('login'), '/login');
});

test('resolveProtectedView enforces authentication and active resume guards', () => {
  assert.equal(
    resolveProtectedView({
      requestedView: 'dashboard',
      isAuthenticated: false,
      hasActiveResume: false,
    }),
    'login'
  );
  assert.equal(
    resolveProtectedView({
      requestedView: 'ats-analyzer',
      isAuthenticated: false,
      hasActiveResume: false,
    }),
    'login'
  );
  assert.equal(
    resolveProtectedView({
      requestedView: 'signup',
      isAuthenticated: false,
      hasActiveResume: false,
    }),
    'signup'
  );
  assert.equal(
    resolveProtectedView({
      requestedView: 'login',
      isAuthenticated: true,
      hasActiveResume: false,
    }),
    'dashboard'
  );
  assert.equal(
    resolveProtectedView({
      requestedView: 'editor',
      isAuthenticated: true,
      hasActiveResume: false,
    }),
    'dashboard'
  );
  assert.equal(
    resolveProtectedView({
      requestedView: 'editor',
      isAuthenticated: true,
      hasActiveResume: true,
    }),
    'editor'
  );
  assert.equal(
    resolveProtectedView({
      requestedView: 'ats-analyzer',
      isAuthenticated: true,
      hasActiveResume: false,
    }),
    'ats-analyzer'
  );
});

test('mapFirebaseAuthError returns friendly non-technical messages for all auth error codes', () => {
  assert.match(
    mapFirebaseAuthError({ code: 'auth/email-already-in-use' }),
    /already exists/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/invalid-email' }),
    /valid email/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/wrong-password' }),
    /incorrect email or password/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/invalid-credential' }),
    /incorrect email or password/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/weak-password' }),
    /at least 6 characters/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/network-request-failed' }),
    /internet connection/i
  );
  const domainMsg = mapFirebaseAuthError(
    { code: 'auth/unauthorized-domain' },
    'my-app.vercel.app'
  );
  assert.match(domainMsg, /my-app\.vercel\.app/);
  assert.doesNotMatch(domainMsg, /FirebaseError:/);
});

test('mapFirestoreError and mapUserFacingError hide raw JSON and stack details', () => {
  const serializedFirestoreErr = new Error(
    JSON.stringify({
      error: 'Missing or insufficient permissions.',
      operationType: 'write',
      path: 'users/123/resumes/abc',
    })
  );
  const friendly = mapFirestoreError(serializedFirestoreErr);
  assert.match(friendly, /permission/i);
  assert.doesNotMatch(friendly, /operationType/);

  const authWrapped = mapUserFacingError({ code: 'auth/weak-password' });
  assert.match(authWrapped, /at least 6 characters/i);
});
