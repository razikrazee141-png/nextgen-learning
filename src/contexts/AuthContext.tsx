import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, PHONE_AUTH_MODE, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, PhoneAuthMode } from '../types';
import {
  isEmail,
  extractIndianPhoneDigits,
  phoneToSimpleEmail,
} from '../lib/phoneUtils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  phoneMode: PhoneAuthMode;
  login: (identifier: string, password?: string) => Promise<{ error: string | null; needsOtp?: boolean }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  register: (data: {
    fullName: string;
    identifier: string;
    isPhone: boolean;
    password?: string;
  }) => Promise<{ error: string | null; needsOtp?: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  resetPasswordEmail: (email: string) => Promise<{ error: string | null; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or re-fetch user profile from the 'profiles' table
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }

      setProfile(data as UserProfile);
      return data as UserProfile;
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      return await fetchProfile(user.id);
    }
    return null;
  }, [user, fetchProfile]);

  useEffect(() => {
    // 1. Check existing session on boot
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Unified Login: single input field for email OR phone number
   */
  const login = async (
    identifier: string,
    password?: string
  ): Promise<{ error: string | null; needsOtp?: boolean }> => {
    const raw = identifier.trim();
    if (!raw) {
      return { error: 'Please enter your email address or 10-digit mobile number.' };
    }

    const isEmailInput = isEmail(raw);

    // Case 1: Email login
    if (isEmailInput) {
      if (!password) {
        return { error: 'Please enter your password.' };
      }
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: raw.toLowerCase(),
          password,
        });
        if (error) {
          return { error: mapAuthErrorMessage(error) };
        }
        return { error: null };
      } catch (err: unknown) {
        const e = err as Error;
        return { error: e.message || 'An unexpected error occurred during login.' };
      }
    }

    // Case 2: Phone login
    const digits = extractIndianPhoneDigits(raw);
    if (!digits) {
      return { error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).' };
    }

    // PHONE MODE: "simple"
    if (PHONE_AUTH_MODE === 'simple') {
      if (!password) {
        return { error: 'Please enter your password.' };
      }
      const simpleEmail = phoneToSimpleEmail(digits);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: simpleEmail,
          password,
        });
        if (error) {
          return { error: mapAuthErrorMessage(error) };
        }
        return { error: null };
      } catch (err: unknown) {
        const e = err as Error;
        return { error: e.message || 'An unexpected error occurred during login.' };
      }
    }

    // PHONE MODE: "otp"
    const e164 = `+91${digits}`;
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
      });
      if (error) {
        return { error: mapAuthErrorMessage(error) };
      }
      return { error: null, needsOtp: true };
    } catch (err: unknown) {
      const e = err as Error;
      return { error: e.message || 'Failed to send OTP.' };
    }
  };

  /**
   * Verify SMS OTP (Used in "otp" mode)
   */
  const verifyOtp = async (phone: string, token: string): Promise<{ error: string | null }> => {
    const digits = extractIndianPhoneDigits(phone);
    if (!digits) {
      return { error: 'Invalid phone number format.' };
    }
    const e164 = `+91${digits}`;

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: token.trim(),
        type: 'sms',
      });
      if (error) {
        return { error: mapAuthErrorMessage(error) };
      }
      return { error: null };
    } catch (err: unknown) {
      const e = err as Error;
      return { error: e.message || 'OTP verification failed.' };
    }
  };

  /**
   * User Registration
   */
  const register = async ({
    fullName,
    identifier,
    isPhone,
    password,
  }: {
    fullName: string;
    identifier: string;
    isPhone: boolean;
    password?: string;
  }): Promise<{ error: string | null; needsOtp?: boolean }> => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      return { error: 'Please provide your full name.' };
    }

    if (!password || password.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
    }

    // 1. Phone Registration
    if (isPhone) {
      const digits = extractIndianPhoneDigits(identifier);
      if (!digits) {
        return { error: 'Please enter a valid 10-digit Indian mobile number.' };
      }
      const e164 = `+91${digits}`;

      if (PHONE_AUTH_MODE === 'simple') {
        const simpleEmail = phoneToSimpleEmail(digits);

        const { data, error } = await supabase.auth.signUp({
          email: simpleEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
              phone: e164,
            },
          },
        });

        if (error) {
          return { error: mapAuthErrorMessage(error) };
        }

        // If auto-confirmed or user object returned
        if (data.user) {
          await fetchProfile(data.user.id);
        }
        return { error: null };
      } else {
        // OTP Mode
        const { error } = await supabase.auth.signUp({
          phone: e164,
          password,
          options: {
            data: {
              full_name: trimmedName,
              phone: e164,
            },
          },
        });

        if (error) {
          return { error: mapAuthErrorMessage(error) };
        }
        return { error: null, needsOtp: true };
      }
    }

    // 2. Email Registration
    const email = identifier.trim().toLowerCase();
    if (!isEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { error: 'Password is required (minimum 8 characters).' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
      },
    });

    if (error) {
      return { error: mapAuthErrorMessage(error) };
    }

    if (data.user) {
      await fetchProfile(data.user.id);
    }

    return { error: null };
  };

  /**
   * Reset password for email accounts
   */
  const resetPasswordEmail = async (
    email: string
  ): Promise<{ error: string | null; message?: string }> => {
    if (!isEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/profile`,
    });

    if (error) {
      return { error: mapAuthErrorMessage(error) };
    }

    return {
      error: null,
      message: 'Password reset link sent! Please check your inbox.',
    };
  };

  /**
   * Sign out
   */
  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin,
        phoneMode: PHONE_AUTH_MODE,
        login,
        verifyOtp,
        register,
        logout,
        refreshProfile,
        resetPasswordEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Human-friendly error translation for common Supabase auth errors
 */
function mapAuthErrorMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email/mobile number or password. Please verify and try again.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'An account with this email or mobile number already exists. Please log in.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password must be at least 8 characters long.';
  }
  if (msg.includes('email rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Supabase email rate limit reached. In your Supabase Dashboard -> Authentication -> Providers -> Email, turn OFF "Confirm email" for instant signup.';
  }
  if (msg.includes('rate limit')) {
    return 'Rate limit reached. In your Supabase Dashboard -> Authentication -> Providers -> Email, turn OFF "Confirm email" to skip email rate limits.';
  }
  if (msg.includes('phone') && (msg.includes('invalid') || msg.includes('format'))) {
    return 'Invalid phone number. Please enter a valid 10-digit Indian mobile number.';
  }
  if (msg.includes('token has expired') || msg.includes('invalid token')) {
    return 'The verification code entered is invalid or has expired.';
  }

  return error.message;
}
