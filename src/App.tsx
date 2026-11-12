/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { createNewResume } from './services/resumeService';
import { Loader2 } from 'lucide-react';

type ViewMode = 'login' | 'signup' | 'dashboard' | 'editor' | 'preview';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('login');
  const [activeResume, setActiveResume] = useState<Resume | null>(null);

  // Initialize Auth & Connection
  useEffect(() => {
    testConnection().catch((err) => console.warn('Connection check:', err));

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        });
        // If user was on login or signup, move to dashboard
        setCurrentView((prev) => (prev === 'login' || prev === 'signup' ? 'dashboard' : prev));
      } else {
        // If not demo user
        setUser((prev) => (prev?.uid === 'demo_user_123' ? prev : null));
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUser(null);
    setActiveResume(null);
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
      setCurrentView('editor');
    } catch (e) {
      console.error('Failed to create new CV:', e);
    }
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
        onNavigate={(view) => setCurrentView(view)}
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
          />
        )}

        {/* Page 4: Resume Creation & Editor */}
        {user && currentView === 'editor' && activeResume && (
          <ResumeEditorPage
            initialResume={activeResume}
            onSave={(updated) => setActiveResume(updated)}
            onPreview={(updated) => {
              setActiveResume(updated);
              setCurrentView('preview');
            }}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {/* Page 5: Resume Preview */}
        {user && currentView === 'preview' && activeResume && (
          <ResumePreviewPage
            resume={activeResume}
            onEdit={() => setCurrentView('editor')}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
