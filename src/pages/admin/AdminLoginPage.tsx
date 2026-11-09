import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, Copy, Check } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { login, logout, refreshProfile } = useAuth();
  const [identifier, setIdentifier] = useState('admin@nextgen.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRolePromotion, setNeedsRolePromotion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const roleFixSql = `DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;

UPDATE public.profiles
SET role = 'admin'
WHERE email = '${needsRolePromotion || 'admin@nextgen.com'}';`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(roleFixSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsRolePromotion(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your admin email or username.');
      return;
    }

    if (!password) {
      setError('Please enter your admin password.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(trimmed, password);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      // Check if the authenticated user has admin role
      const profile = res.profile || (await refreshProfile());
      if (profile && profile.role !== 'admin') {
        // Only sign out if the user is confirmed to be a non-admin student
        await logout();
        setNeedsRolePromotion(profile.email || trimmed);
        setError('Credentials are valid, but this account is currently registered as "student" instead of "admin" in your database.');
        setLoading(false);
        return;
      }

      // Success! State update will automatically reveal the AdminLayout
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred during admin authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-md w-full">
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            NextGen Admin Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            Enter administrative credentials to access the control panel
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs space-y-2">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>

              {needsRolePromotion && (
                <div className="mt-2 pt-2 border-t border-rose-500/20 space-y-2 text-slate-300">
                  <p className="text-[11px]">
                    To elevate this account to Admin, paste and run this command in your <strong>Supabase SQL Editor</strong>:
                  </p>
                  <pre className="p-2 bg-slate-950 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">
                    {roleFixSql}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied SQL!' : 'Copy SQL snippet'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Admin Email / Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@nextgen.com"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Sign In to Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Helper Credentials Note */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">Default Admin Account:</span>
            <div className="font-mono text-[10px] text-slate-400">
              Email: <span className="text-indigo-400">admin@nextgen.com</span>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              Password: <span className="text-indigo-400">NextGenAdmin@123</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Return to Public Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
