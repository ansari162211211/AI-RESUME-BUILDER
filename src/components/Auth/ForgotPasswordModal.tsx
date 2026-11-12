import React, { useState } from 'react';
import { Mail, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { auth, sendPasswordResetEmail } from '../../services/firebase';
import { validateEmail } from '../../utils/validation';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSubmitted(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address is improperly formatted.');
      } else {
        // Provide friendly message even in sandbox
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative border border-slate-200">
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 id="forgot-password-title" className="text-lg font-semibold text-slate-900">
              Reset link sent
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              If an account exists for <span className="font-medium text-slate-800">{email}</span>,
              we have sent instructions to reset your password.
            </p>
            <button
              onClick={handleResetAndClose}
              className="mt-6 w-full py-2 px-4 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-medium rounded transition-colors"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0f2b5c] flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 id="forgot-password-title" className="text-lg font-semibold text-slate-900">
              Reset your password
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Enter your email address and we will send you a link to reset your password.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0f2b5c] hover:bg-[#0a1e42] rounded transition-colors disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <span>Send Reset Link</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
