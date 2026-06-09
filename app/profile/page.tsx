// app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './profile.module.css';

type PlayerSession = {
  id: string;
  email: string | null;
  name: string;
  wins: number | null;
  losses: number | null;
};

export default function ProfilePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(payload => {
        if (!payload.session) {
          router.push('/portal'); // redirect if not logged in
          return;
        }
        setSession(payload.session);
        fetch('/api/supabase/stats/matches')
          .then(res => res.json())
          .then(matches => {
            if (Array.isArray(matches)) {
              setRecentMatches(matches);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => {
        router.push('/portal');
      });
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.loaderContainer}>
          <div className={styles.spinner}></div>
        </div>
        <Footer />
      </>
    );
  }

  if (!session) return null;

  const winRate = session.wins && session.losses && (session.wins + session.losses > 0)
    ? Math.round((session.wins / (session.wins + session.losses)) * 100)
    : 0;

  return (
    <>
      <Navbar />
      <main className={styles.profileContainer}>
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>♞</div>
            <h1 className={styles.profileName}>{session.name}</h1>
            <p className={styles.profileEmail}>{session.email || 'no email'}</p>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{session.wins ?? 0}</span>
              <span className={styles.statLabel}>Wins</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{session.losses ?? 0}</span>
              <span className={styles.statLabel}>Losses</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{winRate}%</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>🏆</span>
              <span className={styles.statLabel}>Rank</span>
            </div>
          </div>

          <div className={styles.recentSection}>
            <h2>Recent Matches</h2>
            <div className={styles.matchList}>
              {recentMatches.length > 0 ? (
                recentMatches.map(match => (
                  <div key={match.id} className={styles.matchItem}>
                    <span>vs {match.opponent_name}</span>
                    <span className={match.result === 'win' ? styles.winBadge : styles.lossBadge}>
                      {match.result.toUpperCase()}
                    </span>
                    <span className={styles.matchDate}>
                      {new Date(match.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className={styles.noMatches}>No matches played yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
