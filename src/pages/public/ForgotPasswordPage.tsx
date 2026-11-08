import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, AlertCircle, CheckCircle, ArrowLeft, Smartphone } from 'lucide-react';
import { isEmail } from '../../lib/phoneUtils';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPasswordEmail, phoneMode } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const res = await resetPasswordEmail(email);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setMessage(res.message || 'Check your email for the reset link.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to login
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your account email to receive a password recovery link.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Account Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 pl-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Note on Phone Accounts */}
        <div className="pt-4 border-t border-slate-100 flex items-start space-x-3 text-xs text-slate-500 bg-slate-50 p-4 rounded-xl">
          <Smartphone className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-700">Signed up with a Mobile Number?</p>
            <p>
              {phoneMode === 'simple'
                ? 'In simple mode, mobile accounts are password-reset by platform administrators. Contact your administrator or support@nextgen.local.'
                : 'You can use the mobile login option directly to receive an SMS verification code.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
