import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatPhoneForDisplay } from '../../lib/phoneUtils';
import { User, Lock, CheckCircle, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [updatingName, setUpdatingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg(null);
    if (!fullName.trim()) {
      setNameMsg({ text: 'Full name cannot be empty.', error: true });
      return;
    }

    if (!user) return;
    setUpdatingName(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id);

    setUpdatingName(false);

    if (error) {
      setNameMsg({ text: error.message, error: true });
    } else {
      await refreshProfile();
      setNameMsg({ text: 'Name updated successfully!' });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ text: 'Password must be at least 8 characters long.', error: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', error: true });
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setUpdatingPassword(false);

    if (error) {
      setPasswordMsg({ text: error.message, error: true });
    } else {
      setPasswordMsg({ text: 'Password changed successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const displayPhone = profile?.phone ? formatPhoneForDisplay(profile.phone) : null;
  const isInternalPhoneEmail = profile?.email?.endsWith('@phone.nextgen.local');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Account & Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal information and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Account Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl mb-3">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {profile?.full_name || 'NextGen Student'}
            </h2>
            <div className="mt-1.5 flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="capitalize">{profile?.role || 'student'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Contact Method</span>
              <span className="font-semibold text-slate-700 break-all">
                {isInternalPhoneEmail
                  ? displayPhone || 'Mobile Account'
                  : profile?.email || user?.email || 'Not specified'}
              </span>
            </div>

            {displayPhone && !isInternalPhoneEmail && (
              <div>
                <span className="text-slate-400 block font-medium">Mobile Phone</span>
                <span className="font-semibold text-slate-700">{displayPhone}</span>
              </div>
            )}

            <div>
              <span className="text-slate-400 block font-medium">Member Since</span>
              <span className="font-semibold text-slate-700">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recent'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile & Password Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Name Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
              <User className="w-5 h-5 text-indigo-600" />
              <h3>Personal Details</h3>
            </div>

            {nameMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  nameMsg.error
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {nameMsg.error ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{nameMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={updatingName}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                {updatingName ? 'Saving...' : 'Save Name'}
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3>Change Password</h3>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  passwordMsg.error
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {passwordMsg.error ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
