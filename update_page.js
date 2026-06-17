const fs = require('fs');
const path = require('path');

const filePath = path.join('app', '(auth)', 'portal', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  /import \{ User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 \} from 'lucide-react';/,
  `import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Trophy, Swords, Globe, Users, ShieldCheck, Activity, Crown } from 'lucide-react';`
);

// 2. Global styling wrapper and hero section
const targetContainerStart = `  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#05050A] relative overflow-hidden px-4 py-12 selection:bg-[#FFB300]/30 selection:text-[#FFB300]">`;

const newContainerStart = `  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#05050A] relative overflow-hidden selection:bg-[#FFB300]/30 selection:text-[#FFB300]">`;

content = content.replace(targetContainerStart, newContainerStart);

// 3. Radial Glow and particles section, plus introducing the two-column grid
const targetGlow = `      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#FFB300]/[0.04] rounded-full filter blur-[160px] pointer-events-none" />`;

const newGlow = `      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-[#FFB300]/[0.04] rounded-full filter blur-[160px] pointer-events-none" />`;

content = content.replace(targetGlow, newGlow);

const targetCardStart = `      {/* Card */}
      <div className="w-full max-w-[520px] relative z-10">`;

const newHeroAndCardStart = `      {/* Two-column container */}
      <div className="container mx-auto px-4 lg:px-8 max-w-[1280px] relative z-10 flex flex-col lg:grid lg:grid-cols-[1.1fr,0.9fr] gap-12 lg:gap-8 min-h-screen items-center justify-center pt-24 pb-12">

        {/* Left Column: Hero Section */}
        <div className="hidden lg:flex flex-col justify-center h-full w-full pr-8 xl:pr-16">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFB300]/10 border border-[#FFB300]/20 mb-6 shadow-[0_0_15px_rgba(255,179,0,0.1)]">
              <Crown size={14} className="text-[#FFB300]" />
              <span className="text-[#FFB300] text-xs font-bold tracking-widest uppercase">Premium Esports Platform</span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold text-white tracking-tight mb-5 leading-[1.1]">
              Master the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB300] to-[#FF6B00] drop-shadow-sm">Global Board</span>
            </h1>
            <p className="text-lg text-[#9CA3AF] max-w-md leading-relaxed font-medium">
              Step into the arena. Play ranked matches, compete in high-stakes tournaments, and climb the global leaderboards.
            </p>
          </div>

          {/* Value Propositions */}
          <div className="flex flex-col gap-6 mb-12">
            <div className="flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-2xl bg-[#0C0C12]/80 border border-white/[0.06] flex items-center justify-center group-hover:border-[#FFB300]/40 group-hover:bg-[#FFB300]/10 transition-all duration-300 shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                <Swords size={24} className="text-[#6B7280] group-hover:text-[#FFB300] transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-bold text-[17px] mb-1">Play Ranked Matches</h3>
                <p className="text-[#6B7280] text-[14px] font-medium">Compete against players of your skill level.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-2xl bg-[#0C0C12]/80 border border-white/[0.06] flex items-center justify-center group-hover:border-[#FFB300]/40 group-hover:bg-[#FFB300]/10 transition-all duration-300 shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                <Trophy size={24} className="text-[#6B7280] group-hover:text-[#FFB300] transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-bold text-[17px] mb-1">Join Tournaments</h3>
                <p className="text-[#6B7280] text-[14px] font-medium">Win exclusive prizes and community fame.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-2xl bg-[#0C0C12]/80 border border-white/[0.06] flex items-center justify-center group-hover:border-[#FFB300]/40 group-hover:bg-[#FFB300]/10 transition-all duration-300 shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                <Globe size={24} className="text-[#6B7280] group-hover:text-[#FFB300] transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-bold text-[17px] mb-1">Track Global Leaderboards</h3>
                <p className="text-[#6B7280] text-[14px] font-medium">See how you rank among the world's best.</p>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/[0.06]">
            <div className="flex flex-col gap-2.5">
              <Users size={20} className="text-[#FFB300]/80" />
              <div>
                <div className="text-white font-extrabold text-xl">3000+</div>
                <div className="text-[#6B7280] text-[11px] uppercase tracking-widest font-bold mt-0.5">Active Players</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Activity size={20} className="text-[#FFB300]/80" />
              <div>
                <div className="text-white font-extrabold text-xl">Live</div>
                <div className="text-[#6B7280] text-[11px] uppercase tracking-widest font-bold mt-0.5">Matchmaking</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <ShieldCheck size={20} className="text-[#FFB300]/80" />
              <div>
                <div className="text-white font-extrabold text-xl">Secure</div>
                <div className="text-[#6B7280] text-[11px] uppercase tracking-widest font-bold mt-0.5">Authentication</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Card */}
        <div className="w-full max-w-[480px] mx-auto relative z-10 lg:mr-0">`;

content = content.replace(targetCardStart, newHeroAndCardStart);

// 4. Update trailing tags
const targetClosing = `      </div>
    </div>
    <Footer />
  </>
);`;

const newClosing = `      </div>
      </div>
    </div>
    <Footer />
  </>
);`;

content = content.replace(targetClosing, newClosing);

// 5. Update form inputs
const targetInput = `          className={\`peer w-full h-[54px] bg-white/[0.025] border rounded-[12px] pl-[42px] pr-[42px] pt-[22px] pb-[6px] text-[14.5px] text-white font-medium focus:outline-none transition-all duration-200 autofill:bg-transparent \${error ? 'border-red-500/50 focus:border-red-500/80 focus:bg-red-500/[0.025]' : 'border-white/[0.08] focus:border-[#FFB300]/55 focus:bg-[#FFB300]/[0.025]'}\`}`;
const newInput = `          className={\`peer w-full h-[54px] bg-white/[0.04] border rounded-[12px] pl-[42px] pr-[42px] pt-[22px] pb-[6px] text-[14.5px] text-white font-medium focus:outline-none transition-all duration-300 autofill:bg-transparent \${error ? 'border-red-500/50 focus:border-red-500/80 focus:bg-red-500/[0.04] focus:shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'border-white/[0.1] hover:border-white/[0.15] focus:border-[#FFB300]/70 focus:bg-[#FFB300]/[0.04] focus:shadow-[0_0_15px_rgba(255,179,0,0.15)]'}\`}`;
content = content.replace(targetInput, newInput);

// 6. Update CTA button in both OTP and Main Form
const targetBtnOtp = `              <button
                type="submit"
                disabled={isVerifyOtpPending || otpCode.length !== 8}
                className="group relative mt-2 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.28)] hover:shadow-[0_10px_30px_rgba(255,107,0,0.42)] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center gap-2">`;
const newBtnOtp = `              <button
                type="submit"
                disabled={isVerifyOtpPending || otpCode.length !== 8}
                className="group relative mt-2 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] via-[#FFC033] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.3)] hover:shadow-[0_12px_36px_rgba(255,107,0,0.5)] active:scale-[0.985] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                <span className="relative z-10 flex items-center gap-2">`;
content = content.replace(targetBtnOtp, newBtnOtp);

const targetBtnMain = `            <button
              type="submit"
              disabled={isPending}
              className="group relative mt-1 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.28)] hover:shadow-[0_10px_30px_rgba(255,107,0,0.42)] active:scale-[0.985] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center gap-2">`;
const newBtnMain = `            <button
              type="submit"
              disabled={isPending}
              className="group relative mt-1 w-full h-[54px] flex justify-center items-center rounded-[13px] font-extrabold text-[15px] text-[#130800] tracking-widest uppercase bg-gradient-to-r from-[#FFB300] via-[#FFC033] to-[#FF6B00] overflow-hidden shadow-[0_6px_22px_rgba(255,107,0,0.3)] hover:shadow-[0_12px_36px_rgba(255,107,0,0.5)] active:scale-[0.985] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
              <span className="relative z-10 flex items-center gap-2">`;
content = content.replace(targetBtnMain, newBtnMain);

// 7. Update Social buttons
const targetDiscord = `          <button
            type="button"
            onClick={handleDiscordLogin}
            disabled={isDiscordLoading || isGoogleLoading}
            className="w-full h-[50px] mb-3 flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-[13px] text-white font-bold text-[14px] tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(88,101,242,0.35)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDiscordLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">`;
const newDiscord = `          <button
            type="button"
            onClick={handleDiscordLogin}
            disabled={isDiscordLoading || isGoogleLoading}
            className="group w-full h-[54px] mb-3 flex items-center justify-center gap-3 bg-[#1C1C26] hover:bg-[#5865F2] border border-white/[0.08] hover:border-transparent rounded-[13px] text-white font-bold text-[14px] tracking-wide transition-all duration-300 hover:shadow-[0_8px_24px_rgba(88,101,242,0.4)] hover:-translate-y-1 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDiscordLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">`;
content = content.replace(targetDiscord, newDiscord);

const targetGoogle = `          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isDiscordLoading || isGoogleLoading}
            className="w-full h-[50px] flex items-center justify-center gap-3 bg-white hover:bg-gray-100 rounded-[13px] text-gray-900 font-bold text-[14px] tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.35)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48">`;
const newGoogle = `          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isDiscordLoading || isGoogleLoading}
            className="group w-full h-[54px] flex items-center justify-center gap-3 bg-[#1C1C26] hover:bg-white border border-white/[0.08] hover:border-transparent rounded-[13px] text-white hover:text-gray-900 font-bold text-[14px] tracking-wide transition-all duration-300 hover:shadow-[0_8px_24px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 48 48">`;
content = content.replace(targetGoogle, newGoogle);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated page.tsx');
