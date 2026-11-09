import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, Smartphone, Mail } from 'lucide-react';
import { extractIndianPhoneDigits, isEmail } from '../../lib/phoneUtils';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, verifyOtp, phoneMode, refreshProfile } = useAuth();

  const handlePostAuthRedirect = async () => {
    const fromPath = (location.state as any)?.from?.pathname;
    if (fromPath) {
      navigate(fromPath, { replace: true });
      return;
    }
    const currentProfile = await refreshProfile();
    if (currentProfile?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/my-courses', { replace: true });
    }
  };

  // Common Form States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register States
  const [fullName, setFullName] = useState('');
  const [regMethod, setRegMethod] = useState<'email' | 'phone'>('email');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // OTP Verification States (used when phoneMode === 'otp')
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmed = loginIdentifier.trim();
    if (!trimmed) {
      setError('Please enter your email or 10-digit mobile number.');
      return;
    }

    setLoading(true);
    const res = await login(trimmed, loginPassword);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.needsOtp) {
      // Switch to OTP verification screen for phone login in OTP mode
      const digits = extractIndianPhoneDigits(trimmed);
      setOtpPhone(digits ? `+91${digits}` : trimmed);
      setIsOtpStep(true);
      return;
    }

    // Success -> Navigate to target page
    await handlePostAuthRedirect();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-check.');
      return;
    }

    const isPhone = regMethod === 'phone';
    const identifier = isPhone ? regPhone : regEmail;

    if (isPhone) {
      const digits = extractIndianPhoneDigits(regPhone);
      if (!digits) {
        setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
        return;
      }
    } else {
      if (!isEmail(regEmail)) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    setLoading(true);
    const res = await register({
      fullName,
      identifier,
      isPhone,
      password: regPassword,
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.needsOtp) {
      const digits = extractIndianPhoneDigits(regPhone);
      setOtpPhone(digits ? `+91${digits}` : regPhone);
      setIsOtpStep(true);
      return;
    }

    // Successful registration
    await handlePostAuthRedirect();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpToken.trim() || otpToken.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent via SMS.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(otpPhone, otpToken);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    await handlePostAuthRedirect();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
              <span>N</span>
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">NextGen</span>
          </Link>
          <p className="mt-1 text-xs text-slate-500 font-medium italic">
            Leading Today, Shaping Tomorrow.
          </p>
        </div>

        {/* Tab switchers if not in OTP step */}
        {!isOtpStep && (
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                mode === 'register'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Alert banners */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* OTP Step Screen */}
        {isOtpStep ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Verify Phone Number</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the 6-digit code sent to <strong className="text-slate-700">{otpPhone}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                SMS Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-lg font-mono px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOtpStep(false);
                setOtpToken('');
              }}
              className="w-full text-xs text-slate-500 hover:text-slate-700 text-center"
            >
              Cancel and go back
            </button>
          </form>
        ) : mode === 'login' ? (
          /* =======================================================
             LOGIN FORM (Single field for email OR phone + password)
             ======================================================= */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email or Mobile Number
              </label>
              <input
                type="text"
                autoComplete="username"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="you@example.com or 9876543210"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your email address, or 10-digit Indian mobile number.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm mt-2"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        ) : (
          /* =======================================================
             REGISTRATION FORM (Toggle between Email OR Mobile)
             ======================================================= */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Toggle: Email vs Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Register Using
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegMethod('email')}
                  className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                    regMethod === 'email'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegMethod('phone')}
                  className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                    regMethod === 'phone'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile (+91)</span>
                </button>
              </div>
            </div>

            {/* Email Field */}
            {regMethod === 'email' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            ) : (
              /* Phone Field */
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  10-Digit Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-sm font-semibold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => {
                      const raw = e.target.value;
                      let digits = raw.replace(/\D/g, '');
                      // Strip +91 country code or leading 0 if pasted
                      if (digits.length === 12 && digits.startsWith('91')) {
                        digits = digits.slice(2);
                      } else if (digits.length === 11 && digits.startsWith('0')) {
                        digits = digits.slice(1);
                      } else if (digits.length > 10) {
                        digits = digits.slice(0, 10);
                      }
                      setRegPhone(digits);
                    }}
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {phoneMode === 'simple'
                    ? 'Simple phone mode active. No SMS verification needed.'
                    : 'SMS OTP verification will be required.'}
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a strong password"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
