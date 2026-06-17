'use client';

import { useActionState, useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Check, Trophy, Swords, ShieldCheck, ChevronRight } from 'lucide-react';
import { loginAction, registerAction, verifyOtpAction } from '@/app/actions/auth';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';

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

  const [rememberMe, setRememberMe] = useState(false);

  // OTP Timer
  const [resendCooldown, setResendCooldown] = useState(0);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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

    if (touched[name] || fieldErrors[name]) {
      const error = validateField(name, value, activeTab, newFormData);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
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
    setIsDiscordLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
  };

  const isPending = isLoginPending || isRegisterPending;

  const passwordsMatch =
    activeTab === 'register' &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#22C55E'][passwordStrength];

  return (
    <div className="min-h-screen bg-[#0A0A10] text-white flex items-center justify-center relative selection:bg-[#FFB300]/30 selection:text-[#FFB300]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
      
      {/* Navbar overlay */}
      <div className="absolute top-0 w-full z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <Navbar />
        </div>
      </div>

      {/* The Portal */}
      <div className="w-full flex flex-col items-center justify-center p-6 sm:p-12 lg:p-20 relative z-10 pt-32" style={{ animation: 'fade-in-up 0.4s ease-out forwards' }}>
        <div className="w-full max-w-[440px]">
          
          {/* Header Mobile / Title */}
          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
              {activeTab === 'login' ? 'Welcome Back' : 'Join the Arena'}
            </h2>
            <p className="text-[15px] text-[#6B7280] font-medium">
              {activeTab === 'login' 
                ? 'Enter your credentials to access your account.' 
                : 'Create an account to start your competitive journey.'}
            </p>
          </div>

          {/* Tabs — segmented control */}
          <div 
            className="relative flex p-1.5 bg-black/40 rounded-xl mb-10 border border-white/[0.06] h-[54px]"
            role="tablist"
          >
            <div
              className="absolute top-1.5 bottom-1.5 rounded-[8px] bg-[#1C1C26] border border-[#FFB300]/30 shadow-[0_0_12px_rgba(255,179,0,0.12)] transition-transform duration-300 ease-out z-0"
              style={{
                transform: activeTab === 'login' ? 'translateX(0)' : 'translateX(100%)',
                width: 'calc(50% - 6px)',
                left: '6px'
              }}
            />
            {(['login', 'register'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 relative z-10 h-full text-[14px] font-bold rounded-[8px] tracking-widest uppercase transition-colors duration-300 delay-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB300] ${
                  activeTab === tab ? 'text-white' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          {isOtpMode ? (
            <form className="flex flex-col gap-5" action={formVerifyOtpAction}>
              {clientError && (
                <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/25 text-red-400 text-[13.5px] font-medium px-4 py-3 rounded-xl">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <span>{clientError}</span>
                </div>
              )}
              
              <div className="text-left mb-2">
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
                label="Enter 8-digit code"
                placeholder="12345678"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                error={verifyOtpState?.error ? 'Invalid code' : undefined}
                classNameOverride={verifyOtpState?.error ? 'border-red-500 bg-red-500/[0.05]' : undefined}
              />

              <button
                type="submit"
                disabled={isVerifyOtpPending || otpCode.length !== 8}
                className="group relative mt-3 w-full h-[56px] flex justify-center items-center rounded-xl font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-[#FFB300] overflow-hidden hover:bg-[#FFC033] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB300]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isVerifyOtpPending ? 'Verifying…' : 'Verify Account'}
                  {!isVerifyOtpPending && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </span>
              </button>
              
              <div className="flex justify-between items-center mt-3 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpMode(false);
                    setClientError(null);
                  }}
                  className="text-[14px] text-[#6B7280] hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFB300] rounded"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-[14px] text-[#FFB300] hover:text-[#FFC933] font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFB300] rounded"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          ) : (
          <form
            className="flex flex-col gap-5"
            action={activeTab === 'login' ? formLoginAction : formRegisterAction}
            onSubmit={activeTab === 'login' ? handleLoginSubmit : handleRegisterSubmit}
          >
            {/* Error banner */}
            {clientError && (
              <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/25 text-red-400 text-[13.5px] font-medium px-4 py-3 rounded-xl">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                <span>{clientError}</span>
              </div>
            )}

            {/* Display Name — register only */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                activeTab === 'register'
                  ? 'max-h-[80px] opacity-100 pointer-events-auto'
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
                    className="text-[#9CA3AF] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB300] rounded"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              {/* Password strength & requirements — register only */}
              {activeTab === 'register' && (
                <div className="px-1 mt-1">
                  {formData.password.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
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
                      <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: strengthColor }}>
                        {strengthLabel}
                      </span>
                    </div>
                  )}
                  <p className="text-[12px] text-[#6B7280]">Min 6 chars, mix of letters & numbers</p>
                </div>
              )}
            </div>

            {/* Confirm Password — register only */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                activeTab === 'register'
                  ? 'max-h-[80px] opacity-100 pointer-events-auto'
                  : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
              }`}
            >
              <FloatingInput
                icon={<ShieldCheck size={18} />}
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
                  <div className="flex items-center gap-2">
                    {passwordsMatch && <CheckCircle2 size={18} className="text-[#22C55E]" />}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="text-[#9CA3AF] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB300] rounded"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                }
              />
            </div>

            {/* Remember Me & Forgot Password */}
            {activeTab === 'login' && (
              <div className="flex justify-between items-center mt-1 mb-2 px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-[18px] h-[18px]">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-full h-full border border-white/20 rounded-[4px] bg-transparent peer-checked:bg-[#FFB300] peer-checked:border-[#FFB300] transition-colors group-hover:border-[#FFB300]/50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#FFB300] peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#0A0A10]" />
                    <Check size={12} className="absolute text-[#130800] opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                  </div>
                  <span className="text-[14px] text-[#9CA3AF] group-hover:text-white transition-colors">Remember me</span>
                </label>
                <a
                  href="/forgot-password"
                  className="text-[13px] text-[#4B5563] hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFB300] rounded"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="group relative mt-2 w-full h-[56px] flex justify-center items-center rounded-xl font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-[#FFB300] overflow-hidden hover:bg-[#FFC033] shadow-[0_0_20px_rgba(255,179,0,0.15)] hover:shadow-[0_0_24px_rgba(255,179,0,0.3)] hover:-translate-y-0.5 active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-[0_0_20px_rgba(255,179,0,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB300]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center gap-2">
                {isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {activeTab === 'login' ? 'Authenticating…' : 'Creating Account…'}
                  </>
                ) : (
                  <>
                    {activeTab === 'login' ? 'Sign In' : 'Create Account'}
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
          )}

            {/* Divider */}
            <div className="flex items-center w-full my-8">
              <div className="flex-1 border-t border-white/10" />
              <span className="px-4 text-[12px] font-bold uppercase tracking-[0.2em] text-[#4B5563]">
                Or Continue With
              </span>
              <div className="flex-1 border-t border-white/10" />
            </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Discord */}
            <button
              type="button"
              onClick={handleDiscordLogin}
              disabled={isDiscordLoading || isGoogleLoading}
              className="group flex-1 relative h-[52px] flex items-center justify-center gap-3 bg-[#1C1C26] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/20 overflow-hidden rounded-xl text-white font-bold text-[14px] tracking-wide transition-all duration-300 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20"
            >
              <span className="relative z-10 flex items-center gap-3">
                {isDiscordLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                )}
                Discord
              </span>
            </button>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isDiscordLoading || isGoogleLoading}
              className="group flex-1 relative h-[52px] flex items-center justify-center gap-3 bg-[#1C1C26] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/20 text-white overflow-hidden rounded-xl font-bold text-[14px] tracking-wide transition-all duration-300 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/20"
            >
              <span className="relative z-10 flex items-center gap-3">
                {isGoogleLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                )}
                Google
              </span>
            </button>
          </div>

        </div>
      </div>
      
    </div>
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
  placeholder?: string;
  classNameOverride?: string;
}

function FloatingInput({ icon, suffix, label, error, placeholder, classNameOverride, ...inputProps }: FloatingInputProps) {
  return (
    <div className="space-y-2 w-full">
      <label htmlFor={inputProps.id} className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider ml-1 block">
        {label}
      </label>
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <span className={`transition-colors duration-200 ${error ? 'text-red-400' : 'text-[#6B7280] group-focus-within:text-[#FFB300]'}`}>
            {icon}
          </span>
        </div>
        <input
          {...inputProps}
          placeholder={placeholder}
          className={`w-full h-14 bg-[#14141B] border rounded-xl pl-11 pr-12 py-3.5 text-sm text-white font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#FFB300] transition-all duration-200 autofill:bg-transparent ${error ? 'border-red-500/50 focus:border-red-500 focus:bg-red-500/[0.02]' : 'border-white/[0.05] hover:border-white/[0.1] focus:border-[#FFB300]/50 focus:bg-[#FFB300]/[0.02]'} ${classNameOverride || ''}`}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center z-10">
            {suffix}
          </div>
        )}
      </div>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-[24px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}>
        <p className="text-red-400 text-[13px] font-medium ml-1 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>
      </div>
    </div>
  );
}
