/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  auth,
  isFirebaseConfigured,
  onAuthStateChanged,
  signOut,
  testConnection,
  type FirebaseUser,
} from './services/firebase';
import type { Resume, AuthUser } from './types/resume';
import { Navbar } from './components/Common/Navbar';
import { LoginPage } from './components/Auth/LoginPage';
import { SignupPage } from './components/Auth/SignupPage';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { ResumeEditorPage } from './components/ResumeEditor/ResumeEditorPage';
import { ResumePreviewPage } from './components/ResumePreview/ResumePreviewPage';
import { TemplatesGalleryPage } from './components/Templates/TemplatesGalleryPage';
import { AtsAnalyzerPage } from './components/AtsAnalyzer/AtsAnalyzerPage';
import {
  createNewResume,
  getUserResumes,
  saveResume,
} from './services/resumeService';
import type { TemplateDefinition } from './data/templates';
import {
  mapUserFacingError,
  pathToView,
  resolveProtectedView,
  viewToPath,
  type AppViewMode,
} from './utils/firebaseHelpers';
import { AlertCircle, Loader2, X } from 'lucide-react';

type ViewMode = AppViewMode;

const ACTIVE_RESUME_SESSION_PREFIX = 'active_resume_id_';

function saveSessionActiveResumeId(userId: string | undefined, resumeId: string | null): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const key = `${ACTIVE_RESUME_SESSION_PREFIX}${userId}`;
    if (resumeId) {
      window.sessionStorage.setItem(key, resumeId);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore sessionStorage restrictions
  }
}

function getSessionActiveResumeId(userId: string | undefined): string | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(`${ACTIVE_RESUME_SESSION_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export default function App() {
  const initialRequestedView =
    typeof window !== 'undefined' ? pathToView(window.location.pathname) : null;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>(
    initialRequestedView === 'signup' ? 'signup' : 'login'
  );
  const [templateReturnView, setTemplateReturnView] = useState<
    'dashboard' | 'editor' | 'preview'
  >('dashboard');
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [atsInitialResume, setAtsInitialResume] = useState<Resume | null>(null);
  const [userResumes, setUserResumes] = useState<Resume[]>([]);
  const [appError, setAppError] = useState<string | null>(null);

  const requestedViewRef = useRef<ViewMode | null>(initialRequestedView);
  const activeResumeRef = useRef<Resume | null>(null);
  activeResumeRef.current = activeResume;

  const syncUrlToView = useCallback((view: ViewMode, replace = false) => {
    if (typeof window === 'undefined') return;
    const targetPath = viewToPath(view);
    if (window.location.pathname === targetPath) return;
    try {
      if (replace) {
        window.history.replaceState({ view }, '', targetPath);
      } else {
        window.history.pushState({ view }, '', targetPath);
      }
    } catch {
      // Ignore history errors in restricted contexts
    }
  }, []);

  const navigateToView = useCallback(
    (view: ViewMode, options?: { replace?: boolean }) => {
      requestedViewRef.current = view;
      setCurrentView(view);
      syncUrlToView(view, options?.replace);
    },
    [syncUrlToView]
  );

  // Persist active resume selection per user across refreshes
  useEffect(() => {
    if (user?.uid) {
      saveSessionActiveResumeId(user.uid, activeResume?.id || null);
    }
  }, [user?.uid, activeResume?.id]);

  // Initialize Auth & Connection
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const fallbackView = resolveProtectedView({
        requestedView: requestedViewRef.current,
        isAuthenticated: false,
        hasActiveResume: false,
      });
      setCurrentView(fallbackView);
      syncUrlToView(fallbackView, true);
      setAuthLoading(false);
      return;
    }

    let resolved = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!resolved) {
        setAuthLoading(false);
      }
    }, 8000);

    testConnection().catch((err) => console.warn('Connection check:', err));

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        resolved = true;
        window.clearTimeout(fallbackTimer);

        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAnonymous: firebaseUser.isAnonymous,
          });
          const requested = requestedViewRef.current;
          // Defer redirect out of editor/preview until resumes attempt restore below if session ID exists
          const hasSessionActiveId = Boolean(getSessionActiveResumeId(firebaseUser.uid));
          const resolvedView =
            (requested === 'editor' || requested === 'preview') &&
            (Boolean(activeResumeRef.current) || hasSessionActiveId)
              ? requested
              : resolveProtectedView({
                  requestedView: requested,
                  isAuthenticated: true,
                  hasActiveResume: Boolean(activeResumeRef.current),
                });
          setCurrentView(resolvedView);
          syncUrlToView(resolvedView, true);
        } else {
          setUser((prev) => {
            if (prev?.uid === 'demo_user_123') {
              return prev;
            }
            const nextGuestView = resolveProtectedView({
              requestedView: requestedViewRef.current,
              isAuthenticated: false,
              hasActiveResume: false,
            });
            setCurrentView(nextGuestView);
            syncUrlToView(nextGuestView, true);
            return null;
          });
        }
        setAuthLoading(false);
      },
      (err) => {
        resolved = true;
        window.clearTimeout(fallbackTimer);
        console.warn('Auth listener error:', err);
        setAuthLoading(false);
      }
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [syncUrlToView]);

  // Enforce route protection when browser Back/Forward triggers popstate
  useEffect(() => {
    const handlePopState = () => {
      const requested = pathToView(window.location.pathname);
      requestedViewRef.current = requested;
      const guarded = resolveProtectedView({
        requestedView: requested,
        isAuthenticated: Boolean(user),
        hasActiveResume: Boolean(activeResumeRef.current),
      });
      setCurrentView(guarded);
      if (viewToPath(guarded) !== window.location.pathname) {
        syncUrlToView(guarded, true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, syncUrlToView]);

  // Guard view transitions when auth state resolves
  useEffect(() => {
    if (authLoading) return;
    if (!user && currentView !== 'login' && currentView !== 'signup') {
      navigateToView('login', { replace: true });
    }
  }, [authLoading, user, currentView, navigateToView]);

  const refreshUserResumes = useCallback(
    async (uid: string) => {
      try {
        const list = await getUserResumes(uid);
        setUserResumes(list);

        // Restore active resume on refresh when visiting /editor or /preview
        if (!activeResumeRef.current && (currentView === 'editor' || currentView === 'preview')) {
          const savedId = getSessionActiveResumeId(uid);
          const restored = savedId ? list.find((r) => r.id === savedId) || null : null;
          if (restored) {
            setActiveResume(restored);
          } else {
            navigateToView('dashboard', { replace: true });
          }
        }
        return list;
      } catch (e) {
        console.error('Failed to refresh resumes:', e);
        setAppError(
          mapUserFacingError(
            e,
            'Could not load your saved resumes from cloud storage right now.'
          )
        );
        return [];
      }
    },
    [currentView, navigateToView]
  );

  useEffect(() => {
    if (user?.uid) {
      refreshUserResumes(user.uid);
    } else {
      setUserResumes([]);
    }
  }, [user?.uid, refreshUserResumes]);

  const handleLogout = async () => {
    const prevUid = user?.uid;
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Signout error:', e);
      }
    }
    saveSessionActiveResumeId(prevUid, null);
    setUser(null);
    setActiveResume(null);
    setAtsInitialResume(null);
    setUserResumes([]);
    setAppError(null);
    navigateToView('login', { replace: true });
  };

  const handleDemoLogin = () => {
    const demoUser: AuthUser = {
      uid: 'demo_user_123',
      email: 'demo.developer@example.com',
      displayName: 'Alex Morgan (Demo)',
    };
    setAppError(null);
    setUser(demoUser);
    navigateToView('dashboard');
  };

  const handleCreateNewResumeDirect = async () => {
    if (!user) {
      navigateToView('login');
      return;
    }
    setAppError(null);
    try {
      const created = await createNewResume(
        user.uid,
        'Academic Research Curriculum Vitae',
        'academic',
        user.displayName || undefined,
        user.email || undefined
      );
      setActiveResume(created);
      setUserResumes((prev) => [created, ...prev]);
      navigateToView('editor');
    } catch (e) {
      console.error('Failed to create new CV:', e);
      setAppError(
        mapUserFacingError(e, 'Could not create a new resume right now. Please try again.')
      );
    }
  };

  const handleOpenTemplates = async (
    fromView: 'dashboard' | 'editor' | 'preview',
    resumeOverride?: Resume | null
  ) => {
    if (!user) {
      navigateToView('login');
      return;
    }
    setTemplateReturnView(fromView);
    const target =
      fromView === 'dashboard'
        ? null
        : resumeOverride !== undefined
        ? resumeOverride
        : activeResume;

    if (user?.uid) {
      await refreshUserResumes(user.uid);
    }
    setActiveResume(target || null);
    navigateToView('templates');
  };

  const handleApplyTemplate = async (
    template: TemplateDefinition,
    targetResume: Resume | null
  ) => {
    if (!user) {
      navigateToView('login');
      return;
    }
    setAppError(null);
    try {
      if (targetResume) {
        const updated: Resume = {
          ...targetResume,
          template: template.id,
          fontFamily: template.defaultCustomization.fontFamily,
          themeColor: template.defaultCustomization.accentColor,
          customization: { ...template.defaultCustomization },
          updatedAt: new Date().toISOString(),
        };
        await saveResume(user.uid, updated);
        setActiveResume(updated);
        setUserResumes((prev) => [
          updated,
          ...prev.filter((r) => r.id !== updated.id),
        ]);
        navigateToView('preview');
      } else {
        const seedType =
          template.id === 'jakes-resume'
            ? 'jakes'
            : template.id === 'classic-professional'
            ? 'classic'
            : template.id === 'two-column-professional'
            ? 'two-column'
            : template.id === 'software-developer'
            ? 'software-developer'
            : template.id === 'harvard-style'
            ? 'harvard'
            : template.id === 'elegant-serif'
            ? 'elegant-serif'
            : template.id === 'modern-corporate'
            ? 'modern-corporate'
            : template.id === 'fresher-resume'
            ? 'fresher-resume'
            : template.id === 'internship-resume'
            ? 'internship-resume'
            : template.id === 'engineering-resume'
            ? 'engineering-resume'
            : template.id === 'creative-professional'
            ? 'creative-professional'
            : template.id === 'executive-resume'
            ? 'executive-resume'
            : template.id === 'research-scholar'
            ? 'research-scholar'
            : template.id === 'simple-one-page'
            ? 'simple-one-page'
            : template.categories.includes('Student & Fresher')
            ? 'fresher'
            : template.categories.includes('Technical & Developer')
            ? 'experienced'
            : 'academic';
        const base = await createNewResume(
          user.uid,
          template.id === 'jakes-resume'
            ? "Jake's Resume"
            : template.id === 'classic-professional'
            ? 'Classic Professional CV'
            : template.id === 'two-column-professional'
            ? 'Two Column Professional CV'
            : template.id === 'software-developer'
            ? 'Software Developer Resume'
            : template.id === 'harvard-style'
            ? 'Harvard Style Resume'
            : template.id === 'elegant-serif'
            ? 'Elegant Serif CV'
            : template.id === 'modern-corporate'
            ? 'Modern Corporate CV'
            : template.id === 'fresher-resume'
            ? 'Fresher Resume'
            : template.id === 'internship-resume'
            ? 'Internship Resume'
            : template.id === 'engineering-resume'
            ? 'Engineering Resume'
            : template.id === 'creative-professional'
            ? 'Creative Professional Resume'
            : template.id === 'executive-resume'
            ? 'Executive Resume'
            : template.id === 'research-scholar'
            ? 'Research Scholar CV'
            : template.id === 'simple-one-page'
            ? 'Simple One-Page Resume'
            : `${template.name} CV`,
          seedType,
          user.displayName || undefined,
          user.email || undefined
        );
        const customized: Resume = {
          ...base,
          template: template.id,
          fontFamily: template.defaultCustomization.fontFamily,
          themeColor: template.defaultCustomization.accentColor,
          customization: { ...template.defaultCustomization },
        };
        await saveResume(user.uid, customized);
        setActiveResume(customized);
        setUserResumes((prev) => [
          customized,
          ...prev.filter((r) => r.id !== customized.id),
        ]);
        navigateToView('preview');
      }
    } catch (e) {
      console.error('Failed to apply template:', e);
      setAppError(
        mapUserFacingError(e, 'Could not apply this template right now. Please try again.')
      );
    }
  };

  const handleNavigate = (view: ViewMode) => {
    setAppError(null);
    if (!user && view !== 'login' && view !== 'signup') {
      navigateToView('login');
      return;
    }
    if (view === 'templates') {
      const origin =
        currentView === 'editor' || currentView === 'preview'
          ? currentView
          : 'dashboard';
      handleOpenTemplates(origin, origin === 'dashboard' ? null : activeResume);
      return;
    }
    if (view === 'dashboard') {
      setActiveResume(null);
      setAtsInitialResume(null);
    }
    if (view === 'ats-analyzer' && user?.uid) {
      refreshUserResumes(user.uid);
    }
    navigateToView(view);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded bg-[#0f2b5c] text-white flex items-center justify-center font-bold mb-4 shadow-sm animate-pulse">
          RB
        </div>
        <Loader2 className="w-6 h-6 text-[#0f2b5c] animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Loading Resume Builder...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Navbar
        user={user}
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onNewResume={handleCreateNewResumeDirect}
        activeResumeTitle={activeResume?.title}
      />

      {appError && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div
            role="alert"
            className="p-3.5 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between gap-3"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{appError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAppError(null)}
              className="p-1 text-red-500 hover:text-red-800 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Page 1: Login */}
        {!user && currentView !== 'signup' && (
          <LoginPage
            onSuccess={() => navigateToView('dashboard')}
            onNavigateToSignup={() => navigateToView('signup')}
            onDemoLogin={handleDemoLogin}
          />
        )}

        {/* Page 2: Signup */}
        {!user && currentView === 'signup' && (
          <SignupPage
            onSuccess={() => navigateToView('dashboard')}
            onNavigateToLogin={() => navigateToView('login')}
          />
        )}

        {/* Page 3: Dashboard */}
        {user && currentView === 'dashboard' && (
          <DashboardPage
            user={user}
            onSelectResumeForEdit={(resume) => {
              setActiveResume(resume);
              navigateToView('editor');
            }}
            onSelectResumeForPreview={(resume) => {
              setActiveResume(resume);
              navigateToView('preview');
            }}
            onOpenTemplates={() => handleOpenTemplates('dashboard', null)}
            onOpenAtsAnalyzer={(resumeOverride) => {
              setAtsInitialResume(resumeOverride || null);
              if (user?.uid) {
                refreshUserResumes(user.uid);
              }
              navigateToView('ats-analyzer');
            }}
          />
        )}

        {/* Page: ATS Resume Analyzer */}
        {user && currentView === 'ats-analyzer' && (
          <AtsAnalyzerPage
            user={user}
            userResumes={userResumes}
            initialResumeForAnalysis={atsInitialResume}
            onBackToDashboard={() => {
              setAtsInitialResume(null);
              navigateToView('dashboard');
            }}
            onOpenInResumeEditor={(resume) => {
              setActiveResume(resume);
              setUserResumes((prev) => [
                resume,
                ...prev.filter((r) => r.id !== resume.id),
              ]);
              navigateToView('editor');
            }}
          />
        )}

        {/* Page 4: Resume Creation & Editor */}
        {user && currentView === 'editor' && activeResume && (
          <ResumeEditorPage
            initialResume={activeResume}
            onSave={(updated) => {
              setActiveResume(updated);
              setUserResumes((prev) => [
                updated,
                ...prev.filter((r) => r.id !== updated.id),
              ]);
            }}
            onPreview={(updated) => {
              setActiveResume(updated);
              navigateToView('preview');
            }}
            onOpenTemplates={(updated) => handleOpenTemplates('editor', updated)}
            onBackToDashboard={() => {
              setActiveResume(null);
              navigateToView('dashboard');
            }}
          />
        )}

        {/* Page 5: Resume Preview */}
        {user && currentView === 'preview' && activeResume && (
          <ResumePreviewPage
            resume={activeResume}
            onEdit={() => navigateToView('editor')}
            onBackToDashboard={() => {
              setActiveResume(null);
              navigateToView('dashboard');
            }}
            onOpenTemplates={() => handleOpenTemplates('preview', activeResume)}
            onResumeUpdate={(updated) => {
              setActiveResume(updated);
              setUserResumes((prev) => [
                updated,
                ...prev.filter((r) => r.id !== updated.id),
              ]);
            }}
          />
        )}

        {/* Page 6: Templates Gallery */}
        {user && currentView === 'templates' && (
          <TemplatesGalleryPage
            resumes={userResumes}
            activeResume={activeResume}
            onApplyTemplate={handleApplyTemplate}
            onBack={() => {
              const targetView =
                templateReturnView !== 'dashboard' && activeResume
                  ? templateReturnView
                  : 'dashboard';
              if (targetView === 'dashboard') {
                setActiveResume(null);
              }
              navigateToView(targetView);
            }}
            backLabel={
              templateReturnView === 'editor' && activeResume
                ? 'Back to Editor'
                : templateReturnView === 'preview' && activeResume
                ? 'Back to Preview'
                : 'Back to Dashboard'
            }
          />
        )}
      </main>
    </div>
  );
}
