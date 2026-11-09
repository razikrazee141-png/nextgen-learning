import React, { useState } from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSqlTip, setShowSqlTip] = useState(false);
  const [copied, setCopied] = useState(false);

  // If initial auth is still checking OR user is present but profile is still loading from Supabase
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
          <p className="text-sm text-slate-400 font-medium">Verifying administrative privileges...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> go to login, then redirect back to /admin after successful authentication
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but profile role is not 'admin'
  if (profile?.role !== 'admin') {
    const userIdentifier = profile?.email || profile?.phone || user.email || user.id;
    const sqlSnippet = `-- In Supabase SQL Editor:
UPDATE public.profiles
SET role = 'admin'
WHERE id = '${user.id}';`;

    const handleSwitchAccount = async () => {
      await logout();
      navigate('/login', { state: { from: location } });
    };

    const handleCopy = () => {
      navigator.clipboard.writeText(sqlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Admin Access Required
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              You are currently signed in as{' '}
              <span className="font-semibold text-slate-200">{profile?.full_name || userIdentifier}</span>{' '}
              with role <span className="inline-block px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-mono text-xs">{profile?.role || 'student'}</span>.
            </p>
            <p className="text-xs text-slate-400">
              Only accounts with the <strong className="text-indigo-400">admin</strong> role can access the NextGen Admin Panel.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Return to Public Site</span>
            </Link>

            <button
              onClick={handleSwitchAccount}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log Out & Sign In with Admin Account</span>
            </button>
          </div>

          {/* Quick SQL Tip for Project Owner */}
          <div className="pt-4 border-t border-slate-700/60 text-left">
            <button
              onClick={() => setShowSqlTip(!showSqlTip)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-300 transition-colors"
            >
              <span>Are you the site owner? Make this account Admin</span>
              {showSqlTip ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSqlTip && (
              <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-400">
                  Run this query in your Supabase SQL Editor to grant this account administrative access:
                </p>
                <pre className="p-2.5 bg-slate-900 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto">
                  {sqlSnippet}
                </pre>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to clipboard!' : 'Copy SQL snippet'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
