'use client';

import { useActionState, useState } from 'react';
import { completeSetupAction } from '@/app/actions/auth';
import { User, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SetupPage() {
  const [setupState, formSetupAction, isSetupPending] = useActionState(completeSetupAction, null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-3
  
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });

  const calcStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9!@#$%^&*]/.test(pw)) score++;
    return score;
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordStrength(value ? calcStrength(value) : 0);
    }
  };

  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
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

        <div className="w-full max-w-[520px] relative z-10">
          {/* Gradient border */}
          <div className="absolute -inset-[1px] bg-gradient-to-b from-[#FFB300]/25 via-[#FFB300]/5 to-transparent rounded-[22px] pointer-events-none" />

          <div className="bg-[#0C0C12]/90 backdrop-blur-2xl border border-[#FFB300]/20 rounded-[22px] p-8 sm:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-15px_rgba(255,179,0,0.07)]">

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-5 group cursor-default">
                <div className="absolute inset-0 bg-[#FFB300] rounded-full blur-[24px] opacity-20 group-hover:opacity-35 transition-opacity duration-500 animate-pulse" />
                <div className="w-[72px] h-[72px] bg-gradient-to-b from-[#1C1C28] to-[#0A0A10] rounded-full border border-[#FFB300]/25 flex items-center justify-center relative z-10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8 text-[#FFB300] drop-shadow-[0_0_12px_rgba(255,179,0,0.7)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
              <h1 className="text-[30px] font-bold text-white tracking-tight mb-1 leading-none text-center">
                Complete Setup
              </h1>
              <p className="text-[14px] font-medium text-[#6B7280] tracking-wide text-center mt-2">
                You're almost there! Set a display name and password.
              </p>
            </div>

            {/* Form */}
            <form action={formSetupAction} className="flex flex-col gap-4">
              <input type="hidden" name="next" value={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/' : '/'} />

              {setupState?.error && (
                <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/25 text-red-400 text-[13.5px] font-medium px-4 py-3 rounded-[12px] mb-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <span>{setupState.error}</span>
                </div>
              )}

              {/* Display Name */}
              <FloatingInput
                icon={<User size={18} />}
                type="text"
                name="name"
                id="name"
                autoComplete="name"
                label="Display Name"
                value={formData.name}
                onChange={handleFieldChange}
                required
              />

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <FloatingInput
                  icon={<Lock size={18} />}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  autoComplete="new-password"
                  label="Create a password"
                  value={formData.password}
                  onChange={handleFieldChange}
                  required
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
                
                {/* Password strength bar */}
                {formData.password.length > 0 && (
                  <div className="flex items-center gap-2 px-1 mt-1">
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

              {/* Confirm Password */}
              <FloatingInput
                icon={<Lock size={18} />}
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                autoComplete="new-password"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleFieldChange}
                required
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSetupPending || (formData.confirmPassword.length > 0 && !passwordsMatch)}
                className="group relative mt-4 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.28)] hover:shadow-[0_10px_30px_rgba(255,107,0,0.42)] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-[-101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  {isSetupPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Completing Setup…
                    </>
                  ) : (
                    'Complete Account'
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

// ─── Reusable floating-label input ───────────────────────────────────────────
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  label: string;
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
