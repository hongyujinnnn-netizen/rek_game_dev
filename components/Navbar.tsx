// components/Navbar.tsx
'use client';

import Link from 'next/link';
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
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [scrolled, setScrolled] = useState(false);

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
      
      <div className={styles.links}>
        <Link href="/" className={styles.navLink}>Play</Link>
        <Link href="/profile" className={styles.navLink}>Profile</Link>
        <Link href="#" className={styles.navLink}>About</Link>
        {session ? (
          <span className={styles.navLink} style={{ color: '#FFB300', fontWeight: 600 }}>
            {session.name}
          </span>
        ) : (
          <Link href="/portal" className={styles.navLink}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}