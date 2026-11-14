/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  auth,
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
import {
  createNewResume,
  getUserResumes,
  saveResume,
} from './services/resumeService';
import type { TemplateDefinition } from './data/templates';
import { Loader2 } from 'lucide-react';

type ViewMode =
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'editor'
  | 'preview'
  | 'templates';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [templateReturnView, setTemplateReturnView] = useState<
    'dashboard' | 'editor' | 'preview'
  >('dashboard');
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [userResumes, setUserResumes] = useState<Resume[]>([]);

  // Initialize Auth & Connection
  useEffect(() => {
    testConnection().catch((err) => console.warn('Connection check:', err));

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAnonymous: firebaseUser.isAnonymous,
          });
          setCurrentView((prev) =>
            prev === 'login' || prev === 'signup' ? 'dashboard' : prev
          );
        } else {
          setUser((prev) => (prev?.uid === 'demo_user_123' ? prev : null));
        }
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshUserResumes = useCallback(async (uid: string) => {
    try {
      const list = await getUserResumes(uid);
      setUserResumes(list);
      return list;
    } catch (e) {
      console.error('Failed to refresh resumes:', e);
      return [];
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      refreshUserResumes(user.uid);
    } else {
      setUserResumes([]);
    }
  }, [user?.uid, refreshUserResumes]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUser(null);
    setActiveResume(null);
    setUserResumes([]);
    setCurrentView('login');
  };

  const handleDemoLogin = () => {
    const demoUser: AuthUser = {
      uid: 'demo_user_123',
      email: 'demo.developer@example.com',
      displayName: 'Alex Morgan (Demo)',
    };
    setUser(demoUser);
    setCurrentView('dashboard');
  };

  const handleCreateNewResumeDirect = async () => {
    if (!user) return;
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
      setCurrentView('editor');
    } catch (e) {
      console.error('Failed to create new CV:', e);
    }
  };

  const handleOpenTemplates = async (
    fromView: 'dashboard' | 'editor' | 'preview',
    resumeOverride?: Resume | null
  ) => {
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
    setCurrentView('templates');
  };

  const handleApplyTemplate = async (
    template: TemplateDefinition,
    targetResume: Resume | null
  ) => {
    if (!user) return;
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
        setCurrentView('preview');
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
        setCurrentView('preview');
      }
    } catch (e) {
      console.error('Failed to apply template:', e);
    }
  };

  const handleNavigate = (view: ViewMode) => {
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
    }
    setCurrentView(view);
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

      <main className="flex-1">
        {/* Page 1: Login */}
        {currentView === 'login' && !user && (
          <LoginPage
            onSuccess={() => setCurrentView('dashboard')}
            onNavigateToSignup={() => setCurrentView('signup')}
            onDemoLogin={handleDemoLogin}
          />
        )}

        {/* Page 2: Signup */}
        {currentView === 'signup' && !user && (
          <SignupPage
            onSuccess={() => setCurrentView('dashboard')}
            onNavigateToLogin={() => setCurrentView('login')}
          />
        )}

        {/* Page 3: Dashboard */}
        {user && currentView === 'dashboard' && (
          <DashboardPage
            user={user}
            onSelectResumeForEdit={(resume) => {
              setActiveResume(resume);
              setCurrentView('editor');
            }}
            onSelectResumeForPreview={(resume) => {
              setActiveResume(resume);
              setCurrentView('preview');
            }}
            onOpenTemplates={() => handleOpenTemplates('dashboard', null)}
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
              setCurrentView('preview');
            }}
            onOpenTemplates={(updated) => handleOpenTemplates('editor', updated)}
            onBackToDashboard={() => {
              setActiveResume(null);
              setCurrentView('dashboard');
            }}
          />
        )}

        {/* Page 5: Resume Preview */}
        {user && currentView === 'preview' && activeResume && (
          <ResumePreviewPage
            resume={activeResume}
            onEdit={() => setCurrentView('editor')}
            onBackToDashboard={() => {
              setActiveResume(null);
              setCurrentView('dashboard');
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
              setCurrentView(targetView);
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
