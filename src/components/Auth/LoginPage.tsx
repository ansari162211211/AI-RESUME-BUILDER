import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
} from '../../services/firebase';
import { validateLogin } from '../../utils/validation';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateToSignup: () => void;
  onDemoLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateToSignup,
  onDemoLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validation = validateLogin(email, password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess();
    } catch (err: any) {
      console.error('Firebase login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setAuthError('Invalid email or password. Please verify and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many failed attempts. Please reset your password or try again later.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password provider is not yet enabled in Firebase Console. You can use Google Sign-In or Demo mode below.');
      } else {
        setAuthError(err.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google Sign-In was cancelled or failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-xs p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#0f2b5c] text-white font-bold text-xl mb-3 shadow-xs">
            RB
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Build, edit, and export professional resumes in minutes.
          </p>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="leading-snug">{authError}</div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="name@example.com"
                className={`w-full pl-9 pr-3 py-2 border rounded text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent ${
                  errors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs text-[#0f2b5c] hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2 border rounded text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent ${
                  errors.password ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 inline-flex items-center justify-center py-2.5 px-4 border border-transparent rounded text-sm font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e42] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f2b5c] shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-500 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center py-2 px-4 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] transition-colors disabled:opacity-60 cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" />
          ) : (
            <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>Sign In with Google</span>
        </button>

        {/* Demo Mode Button for fast evaluation */}
        <div className="mt-3">
          <button
            type="button"
            onClick={onDemoLogin}
            className="w-full flex items-center justify-center py-2 px-4 border border-dashed border-slate-300 hover:border-[#0f2b5c] rounded text-xs font-medium text-slate-600 hover:text-[#0f2b5c] bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            <span>Test-Drive Demo Account (Instant Access)</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToSignup}
            className="font-semibold text-[#0f2b5c] hover:underline"
          >
            Create Account
          </button>
        </div>

        {/* Temporary Auth Domain Debug Info */}
        <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1.5">
          <div className="font-semibold text-slate-900">
            Firebase Auth Debug Info (Temporary)
          </div>
          <div className="break-all">
            <span className="font-medium text-slate-600">window.location.origin:</span>{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
              {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
            </code>
          </div>
          <div className="break-all">
            <span className="font-medium text-slate-600">window.location.hostname:</span>{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
              {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}
            </code>
          </div>
          <div className="break-all">
            <span className="font-medium text-slate-600">Firebase authDomain:</span>{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
              {auth.app.options.authDomain || 'N/A'}
            </code>
          </div>
          <div className="break-all">
            <span className="font-medium text-slate-600">Firebase projectId:</span>{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
              {auth.app.options.projectId || 'N/A'}
            </code>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
