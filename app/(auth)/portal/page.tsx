'use client';

import { useActionState, useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginAction, registerAction, verifyOtpAction } from '@/app/actions/auth';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PortalPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const [loginState, formLoginAction, isLoginPending] = useActionState(loginAction, null);
  const [registerState, formRegisterAction, isRegisterPending] = useActionState(registerAction, null);
  const [verifyOtpState, formVerifyOtpAction, isVerifyOtpPending] = useActionState(verifyOtpAction, null);

  const [clientError, setClientError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-3
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setClientError(null);
    setFieldErrors({});
    setTouched({});
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setPasswordStrength(0);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'login' && loginState?.error) setClientError(loginState.error);
    if (activeTab === 'register') {
      if (registerState?.error) setClientError(registerState.error);
      if (registerState?.requiresOtp && registerState?.email) {
        setIsOtpMode(true);
        setOtpEmail(registerState.email);
        setClientError(null);
      }
    }
  }, [loginState, registerState, activeTab]);

  useEffect(() => {
    if (verifyOtpState?.error) setClientError(verifyOtpState.error);
  }, [verifyOtpState]);

  const calcStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9!@#$%^&*]/.test(pw)) score++;
    return score;
  };

  const validateField = (name: string, value: string, currentTab: 'login' | 'register', allValues: typeof formData) => {
    let error = '';
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) error = 'Email is required';
      else if (!emailRegex.test(value)) error = 'Invalid email address';
    } else if (name === 'password') {
      if (!value) error = 'Password is required';
      else if (currentTab === 'register' && value.length < 6) error = 'Password must be at least 6 characters';
    } else if (name === 'name' && currentTab === 'register') {
      if (!value) error = 'Display name is required';
      else if (value.trim().length < 3) error = 'Display name must be at least 3 characters';
    } else if (name === 'confirmPassword' && currentTab === 'register') {
      if (!value) error = 'Confirm password is required';
      else if (value !== allValues.password) error = 'Passwords do not match';
    }
    return error;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value, activeTab, formData);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    if (clientError) setClientError(null);
    if (name === 'password') setPasswordStrength(value ? calcStrength(value) : 0);

    // Validate on change if field was already touched/errored
    if (touched[name] || fieldErrors[name]) {
      const error = validateField(name, value, activeTab, newFormData);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
    // Re-validate confirm password if password changes
    if (name === 'password' && (touched['confirmPassword'] || fieldErrors['confirmPassword'])) {
      const cpError = validateField('confirmPassword', newFormData.confirmPassword, activeTab, newFormData);
      setFieldErrors(prev => ({ ...prev, confirmPassword: cpError }));
    }
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const newErrors: Record<string, string> = {};
    newErrors.email = validateField('email', formData.email, 'login', formData);
    newErrors.password = validateField('password', formData.password, 'login', formData);
    
    if (newErrors.email || newErrors.password) {
      e.preventDefault();
      setFieldErrors(newErrors);
      setTouched({ email: true, password: true });
      return;
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const newErrors: Record<string, string> = {};
    newErrors.name = validateField('name', formData.name, 'register', formData);
    newErrors.email = validateField('email', formData.email, 'register', formData);
    newErrors.password = validateField('password', formData.password, 'register', formData);
    newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword, 'register', formData);

    if (newErrors.name || newErrors.email || newErrors.password || newErrors.confirmPassword) {
      e.preventDefault();
      setFieldErrors(newErrors);
      setTouched({ name: true, email: true, password: true, confirmPassword: true });
      return;
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setIsDiscordLoading(true);
      setClientError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (e: any) {
      setClientError(e.message || 'Failed to initialize Discord login');
      setIsDiscordLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setClientError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (e: any) {
      setClientError(e.message || 'Failed to initialize Google login');
      setIsGoogleLoading(false);
    }
  };

  const isPending = isLoginPending || isRegisterPending;

  const passwordsMatch =
    activeTab === 'register' &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#22C55E'][passwordStrength];

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#05050A] relative overflow-hidden px-4 py-12 selection:bg-[#FFB300]/30 selection:text-[#FFB300]">

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#FFB300]/[0.04] rounded-full filter blur-[160px] pointer-events-none" />

      {/* Chess grid pattern */}
      <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:60px_60px] bg-[position:0_0,30px_30px] pointer-events-none mix-blend-overlay" />

      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-[#FFB300]/50 rounded-full animate-ping shadow-[0_0_8px_#FFB300]" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-[#FF6B00]/40 rounded-full animate-ping shadow-[0_0_8px_#FF6B00]" style={{ animationDuration: '4.5s', animationDelay: '1s' }} />
      <div className="absolute top-2/3 left-1/3 w-1 h-1 bg-[#FFB300]/30 rounded-full animate-ping shadow-[0_0_8px_#FFB300]" style={{ animationDuration: '5s', animationDelay: '2s' }} />

      {/* Card */}
      <div className="w-full max-w-[520px] relative z-10">

        {/* Gradient border */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-[#FFB300]/25 via-[#FFB300]/5 to-transparent rounded-[22px] pointer-events-none" />

        <div className="bg-[#0C0C12]/90 backdrop-blur-2xl border border-[#FFB300]/20 rounded-[22px] p-8 sm:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-15px_rgba(255,179,0,0.07)]">

          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-5 group cursor-default">
              <div className="absolute inset-0 bg-[#FFB300] rounded-full blur-[24px] opacity-20 group-hover:opacity-35 transition-opacity duration-500 animate-pulse" />
              <div className="w-[72px] h-[72px] bg-gradient-to-b from-[#1C1C28] to-[#0A0A10] rounded-full border border-[#FFB300]/25 flex items-center justify-center relative z-10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                  className="text-[#FFB300] drop-shadow-[0_0_12px_rgba(255,179,0,0.7)]">
                  <path d="M2 20H22V22H2V20ZM2 18L4.5 5L9 11L12 2L15 11L19.5 5L22 18H2Z" fill="currentColor" />
                </svg>
              </div>
            </div>
            <h1 className="text-[30px] font-bold text-white tracking-tight mb-1 leading-none">
              Challenger Portal
            </h1>
            <p className="text-[14px] font-medium text-[#6B7280] tracking-wide uppercase">
              Competitive Chess Platform
            </p>
          </div>

          {/* Tabs — segmented control */}
          <div className="relative flex p-1.5 bg-black/40 rounded-full mb-8 border border-white/[0.06] h-[50px]">
            {/* Sliding pill — uses left/width instead of translateX to avoid gap math */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-full bg-[#1C1C26] border border-[#FFB300]/35 shadow-[0_0_18px_rgba(255,179,0,0.18)] transition-all duration-300 ease-out z-0"
              style={{
                left: activeTab === 'login' ? '6px' : 'calc(50% + 3px)',
                width: 'calc(50% - 9px)',
              }}
            />
            {(['login', 'register'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 relative z-10 h-full text-[13px] font-bold rounded-full tracking-widest uppercase transition-colors duration-300 ${
                  activeTab === tab ? 'text-[#FFB300]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          {isOtpMode ? (
            <form className="flex flex-col gap-4" action={formVerifyOtpAction}>
              {clientError && (
                <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/25 text-red-400 text-[13.5px] font-medium px-4 py-3 rounded-[12px]">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <span>{clientError}</span>
                </div>
              )}
              
              <div className="text-center mb-2">
                <p className="text-[#9CA3AF] text-[14px]">
                  We've sent an 8-digit confirmation code to:
                </p>
                <p className="text-white font-bold text-[15px] mt-1">{otpEmail}</p>
              </div>

              <input type="hidden" name="email" value={otpEmail} />

              <FloatingInput
                icon={<Lock size={18} />}
                type="text"
                name="token"
                id="token"
                autoComplete="one-time-code"
                label="Confirmation Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />

              <button
                type="submit"
                disabled={isVerifyOtpPending || otpCode.length !== 8}
                className="group relative mt-2 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.28)] hover:shadow-[0_10px_30px_rgba(255,107,0,0.42)] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isVerifyOtpPending ? 'Verifying…' : 'Verify Account'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOtpMode(false);
                  setClientError(null);
                }}
                className="mt-3 text-[13px] text-[#6B7280] hover:text-white transition-colors duration-200"
              >
                ← Back to sign up
              </button>
            </form>
          ) : (
          <form
            className="flex flex-col gap-4"
            action={activeTab === 'login' ? formLoginAction : formRegisterAction}
            onSubmit={activeTab === 'login' ? handleLoginSubmit : handleRegisterSubmit}
          >

            {/* Error banner */}
            {clientError && (
              <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/25 text-red-400 text-[13.5px] font-medium px-4 py-3 rounded-[12px]">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                <span>{clientError}</span>
              </div>
            )}

            {/* Display Name — register only */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                activeTab === 'register'
                  ? 'max-h-[64px] opacity-100 pointer-events-auto'
                  : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
              }`}
            >
              <FloatingInput
                icon={<User size={18} />}
                type="text"
                name="name"
                id="name"
                autoComplete="name"
                label="Display Name"
                value={formData.name}
                onChange={handleFieldChange}
                onBlur={handleBlur}
                error={activeTab === 'register' ? fieldErrors.name : undefined}
              />
            </div>

            {/* Email */}
            <FloatingInput
              icon={<Mail size={18} />}
              type="email"
              name="email"
              id="email"
              autoComplete="email"
              label="Email Address"
              value={formData.email}
              onChange={handleFieldChange}
              onBlur={handleBlur}
              error={fieldErrors.email}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <FloatingInput
                icon={<Lock size={18} />}
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                label="Password"
                value={formData.password}
                onChange={handleFieldChange}
                onBlur={handleBlur}
                error={fieldErrors.password}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
              {/* Password strength bar — register only */}
              {activeTab === 'register' && formData.password.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="h-[3px] flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: passwordStrength >= i ? strengthColor : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password — register only */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                activeTab === 'register'
                  ? 'max-h-[64px] opacity-100 pointer-events-auto'
                  : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
              }`}
            >
              <FloatingInput
                icon={<Lock size={18} />}
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                autoComplete="new-password"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleFieldChange}
                onBlur={handleBlur}
                error={activeTab === 'register' ? fieldErrors.confirmPassword : undefined}
                suffix={
                  formData.confirmPassword.length > 0 ? (
                    passwordsMatch ? (
                      <CheckCircle2 size={17} className="text-green-500" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors focus:outline-none"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors focus:outline-none"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  )
                }
              />
            </div>

            {/* Forgot password — login only */}
            {activeTab === 'login' && (
              <div className="flex justify-end -mt-1">
                <a
                  href="/forgot-password"
                  className="text-[13px] text-[#6B7280] hover:text-[#FFB300] transition-colors duration-200"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="group relative mt-4 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.28)] hover:shadow-[0_10px_30px_rgba(255,107,0,0.42)] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center gap-2">
                {isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {activeTab === 'login' ? 'Authenticating…' : 'Creating Account…'}
                  </>
                ) : (
                  activeTab === 'login' ? 'Sign In' : 'Create Account'
                )}
              </span>
            </button>
          </form>
          )}

          {/* Divider */}
          <div className="relative mt-10 mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0C0C12] px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-[#4B5563]">
                or continue with
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Discord */}
            <button
              type="button"
              onClick={handleDiscordLogin}
              disabled={isDiscordLoading || isGoogleLoading}
              className="flex-1 w-full h-[50px] flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-[13px] text-white font-bold text-[14px] tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(88,101,242,0.35)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDiscordLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
              )}
              Discord
            </button>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isDiscordLoading || isGoogleLoading}
              className="flex-1 w-full h-[50px] flex items-center justify-center gap-3 bg-white hover:bg-gray-100 border border-[#3F3F46] rounded-[13px] text-gray-900 font-bold text-[14px] tracking-wide transition-all duration-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              Google
            </button>
          </div>

          {/* Footer switch */}
          <p className="mt-6 text-center text-[13px] text-[#4B5563]">
            {activeTab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
              className="text-[#FFB300] hover:text-[#FFC933] font-semibold transition-colors duration-200 focus:outline-none"
            >
              {activeTab === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
    <Footer />
  </>
);
}

// ─── Reusable floating-label input ───────────────────────────────────────────
interface FloatingInputProps {
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  label: string;
  type: string;
  name: string;
  id: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
}

function FloatingInput({ icon, suffix, label, error, ...inputProps }: FloatingInputProps) {
  return (
    <div className="relative group flex flex-col w-full">
      <div className="relative w-full">
        <div className={`absolute left-[14px] top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10 ${error ? 'text-red-400' : 'text-[#4B5563] group-focus-within:text-[#FFB300]'}`}>
          {icon}
        </div>
        <input
          {...inputProps}
          placeholder=" "
          className={`peer w-full h-[54px] bg-white/[0.025] border rounded-[12px] pl-[42px] pr-[42px] pt-[22px] pb-[6px] text-[14.5px] text-white font-medium focus:outline-none transition-all duration-200 autofill:bg-transparent ${error ? 'border-red-500/50 focus:border-red-500/80 focus:border-l-[3px] focus:border-l-red-500 focus:bg-red-500/[0.025]' : 'border-white/[0.08] focus:border-[#FFB300]/55 focus:border-l-[3px] focus:border-l-[#FFB300] focus:bg-[#FFB300]/[0.025]'}`}
        />
        <label
          htmlFor={inputProps.id}
          className={`absolute left-[42px] pointer-events-none transition-all duration-200
            top-[8px] translate-y-0 text-[10px] font-semibold tracking-wide
            peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal
            peer-focus:top-[8px] peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wide
            ${error ? 'text-red-400' : 'text-[#6B7280] peer-placeholder-shown:text-[#4B5563] peer-focus:text-[#FFB300]'}`}
        >
          {label}
        </label>
        {suffix && (
          <div className="absolute right-[14px] top-1/2 -translate-y-1/2 z-10">
            {suffix}
          </div>
        )}
      </div>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-[24px] opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
        <p className="text-red-400 text-[12.5px] font-medium ml-1 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>
      </div>
    </div>
  );
}
