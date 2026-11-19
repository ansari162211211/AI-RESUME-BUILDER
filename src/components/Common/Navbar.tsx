import React from 'react';
import {
  FileText,
  LogOut,
  LayoutDashboard,
  Plus,
  LayoutTemplate,
  FileSearch,
} from 'lucide-react';
import type { AuthUser } from '../../types/resume';

type NavView =
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'editor'
  | 'preview'
  | 'templates'
  | 'ats-analyzer';

interface NavbarProps {
  user: AuthUser | null;
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onLogout: () => void;
  onNewResume?: () => void;
  activeResumeTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
  onNewResume,
  activeResumeTitle,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink-0">
          <button
            onClick={() => onNavigate(user ? 'dashboard' : 'login')}
            className="flex items-center space-x-2 sm:space-x-2.5 focus:outline-none group text-left"
            aria-label="Resume Builder Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-[#0f2b5c] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                Resume<span className="text-[#0f2b5c]">Builder</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Clean &amp; Functional
              </span>
            </div>
          </button>

          {/* Contextual breadcrumb / active title */}
          {user && activeResumeTitle && (currentView === 'editor' || currentView === 'preview') && (
            <div className="hidden md:flex items-center text-sm text-slate-500 pl-3 border-l border-slate-200">
              <span className="truncate max-w-[200px] text-slate-700 font-medium">
                {activeResumeTitle}
              </span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="capitalize text-slate-500">{currentView}</span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
          {user ? (
            <>
              <button
                onClick={() => onNavigate('ats-analyzer')}
                data-testid="navbar-ats-btn"
                className={`inline-flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 text-sm font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  currentView === 'ats-analyzer'
                    ? 'text-[#0f2b5c] bg-blue-50 font-semibold'
                    : 'text-slate-700 hover:text-[#0f2b5c] hover:bg-slate-50'
                }`}
                aria-label="Open Resume Checker"
              >
                <FileSearch className="w-4 h-4" />
                <span className="hidden sm:inline">Resume Checker</span>
              </button>

              <button
                onClick={() => onNavigate('templates')}
                className={`inline-flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 text-sm font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  currentView === 'templates'
                    ? 'text-[#0f2b5c] bg-blue-50 font-semibold'
                    : 'text-slate-700 hover:text-[#0f2b5c] hover:bg-slate-50'
                }`}
                aria-label="Browse Resume Templates"
              >
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
              </button>

              {currentView !== 'dashboard' && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-[#0f2b5c] hover:bg-slate-50 rounded transition-colors"
                  aria-label="Back to Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">My Resumes</span>
                </button>
              )}

              {currentView === 'dashboard' && onNewResume && (
                <button
                  onClick={onNewResume}
                  className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 text-sm font-medium text-white bg-[#0f2b5c] hover:bg-[#0a1e42] rounded shadow-xs transition-colors"
                  aria-label="Create New Resume"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Resume</span>
                </button>
              )}

              {/* User Info & Logout */}
              <div className="flex items-center space-x-1 sm:space-x-2 pl-1.5 sm:pl-3 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                    {user.email || 'Signed In'}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('login')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  currentView === 'login'
                    ? 'text-[#0f2b5c] bg-slate-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className={`px-3.5 py-1.5 text-sm font-medium rounded transition-colors ${
                  currentView === 'signup'
                    ? 'bg-[#0a1e42] text-white'
                    : 'bg-[#0f2b5c] hover:bg-[#0a1e42] text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
