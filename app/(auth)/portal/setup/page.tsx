'use client';

import { useActionState, useState } from 'react';
import { completeSetupAction } from '@/app/actions/auth';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
      setPasswordStrength(calcStrength(value));
    }
  };

  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#22C55E'][passwordStrength];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0C0C12] text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FFB300]/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FFB300]/5 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        </div>

        <div className="w-full max-w-[440px] relative z-10">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1A1A24] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-6">
              <svg className="w-8 h-8 text-[#FFB300]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Complete Setup</h1>
            <p className="text-[#9CA3AF] text-[15px]">You're almost there! Set a display name and password to finish creating your account.</p>
          </div>

          {/* Form Card */}
          <div className="bg-[#1A1A24]/80 backdrop-blur-xl rounded-[24px] border border-white/[0.05] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {setupState?.error && (
              <div className="mb-6 p-4 rounded-[12px] bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{setupState.error}</p>
              </div>
            )}

            <form action={formSetupAction} className="space-y-5">
              <input type="hidden" name="next" value={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/' : '/'} />

              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider ml-1">Display Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-[#6B7280] group-focus-within:text-[#FFB300] transition-colors" />
                  </div>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleFieldChange}
                    className={`w-full bg-[#0C0C12] border border-white/[0.05] rounded-[14px] py-3.5 pl-11 pr-4 text-[15px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFB300]/50 focus:ring-1 focus:ring-[#FFB300]/50 transition-all`}
                    placeholder="Enter your display name"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider ml-1">Set Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#6B7280] group-focus-within:text-[#FFB300] transition-colors" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleFieldChange}
                    className={`w-full bg-[#0C0C12] border border-white/[0.05] rounded-[14px] py-3.5 pl-11 pr-12 text-[15px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFB300]/50 focus:ring-1 focus:ring-[#FFB300]/50 transition-all`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#6B7280] hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {formData.password.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 ml-1">
                    <div className="flex gap-1 w-24">
                      {[1, 2, 3].map((step) => (
                        <div 
                          key={step} 
                          className="h-1 w-full rounded-full transition-colors duration-300"
                          style={{ backgroundColor: passwordStrength >= step ? strengthColor : '#374151' }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 ${passwordsMatch ? 'text-[#22C55E]' : 'text-[#6B7280]'} transition-colors`} />
                  </div>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleFieldChange}
                    className={`w-full bg-[#0C0C12] border ${formData.confirmPassword.length > 0 ? (passwordsMatch ? 'border-[#22C55E]/50' : 'border-red-500/50') : 'border-white/[0.05]'} rounded-[14px] py-3.5 pl-11 pr-12 text-[15px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFB300]/50 focus:ring-1 focus:ring-[#FFB300]/50 transition-all`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#6B7280] hover:text-white transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSetupPending || (formData.confirmPassword.length > 0 && !passwordsMatch)}
                className="w-full h-[50px] mt-4 flex items-center justify-center gap-2 bg-[#FFB300] hover:bg-[#FFC933] rounded-[13px] text-black font-bold text-[15px] tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(255,179,0,0.3)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {isSetupPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Completing Setup…
                  </>
                ) : (
                  'Complete Account'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
