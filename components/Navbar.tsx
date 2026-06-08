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
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>♞</span> Leung Rek
        </Link>
        <div className={styles.links}>
          <Link href="/" className={styles.navLink}>Play</Link>
          <Link href="/profile" className={styles.navLink}>Profile</Link>
          {session && (
            <span className={styles.userBadge}>
              {session.name}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}