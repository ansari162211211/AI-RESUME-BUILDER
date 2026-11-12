import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import {
  auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '../../services/firebase';
import { validateSignup } from '../../utils/validation';

interface SignupPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onSuccess,
  onNavigateToLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validation = validateSignup(fullName, email, password, confirmPassword);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Save display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: fullName.trim(),
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Firebase signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('The password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Invalid email address format.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Email/Password signups are not enabled yet in Firebase Console. Please try Google Sign-In or Demo login on the sign-in page.'
        );
      } else {
        setAuthError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
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
            Create Your Account
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Start crafting your customized, ATS-friendly resume today.
          </p>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="leading-snug">{authError}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                placeholder="Jane Doe"
                className={`w-full pl-9 pr-3 py-2 border rounded text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent ${
                  errors.fullName ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="jane.doe@example.com"
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
            <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="At least 6 characters"
                className={`w-full pl-9 pr-3 py-2 border rounded text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent ${
                  errors.password ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                placeholder="Repeat your password"
                className={`w-full pl-9 pr-3 py-2 border rounded text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center py-2.5 px-4 border border-transparent rounded text-sm font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e42] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f2b5c] shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-semibold text-[#0f2b5c] hover:underline"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};
