// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

type PlayerSession = {
  id: string;
  email: string | null;
  name: string;
  wins: number | null;
  losses: number | null;
};

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(payload => setSession(payload.session))
      .catch(() => setSession(null));

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <Link href="/" className={styles.logo}>
        <svg className={styles.logoIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 20H22V22H2V20ZM2 18L4.5 5L9 11L12 2L15 11L19.5 5L22 18H2Z" fill="currentColor" stroke="none" />
        </svg>
        <span className={styles.logoText}>LEUNG<span className={styles.logoAccent}>REK</span></span>
      </Link>
      
      <button 
        className={styles.mobileToggle} 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`${styles.hamburger} ${mobileMenuOpen ? styles.hamburgerOpen : ''}`}></span>
      </button>

      <div className={`${styles.links} ${mobileMenuOpen ? styles.linksOpen : ''}`}>
        <Link href="/" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Play</Link>
        <Link href="/profile" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Matches</Link>
        {session ? (
          <div className={styles.accountMenu}>
            <span className={styles.accountName}>
              {session.name}
            </span>
            <button 
              className={styles.logoutBtn}
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.reload();
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link href="/portal" className={`${styles.navLink} ${pathname === '/portal' ? 'text-[#FFB300] drop-shadow-[0_0_8px_rgba(255,179,0,0.5)]' : ''}`} onClick={() => setMobileMenuOpen(false)}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}