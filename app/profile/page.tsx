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
  const [liveStats, setLiveStats] = useState<{wins: number, losses: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.json())
      .then(payload => {
        if (!payload.session) {
          router.push('/portal'); // redirect if not logged in
          return;
        }
        setSession(payload.session);
        fetch('/api/supabase/stats/matches', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            const matchesArray = data.matches || [];
            if (Array.isArray(matchesArray)) {
              const mappedMatches = matchesArray.map((m: any) => {
                // Determine if this user played as Red or Blue
                const isRed = m.player_red_id === payload.session.id;
                const opponentName = isRed ? (m.player_blue_name || 'Guest') : (m.player_red_name || 'Guest');
                
                let result = 'draw';
                if (m.winner === 'red') {
                  result = isRed ? 'win' : 'loss';
                } else if (m.winner === 'blue') {
                  result = !isRed ? 'win' : 'loss';
                }

                return {
                  id: m.id,
                  opponent_name: opponentName,
                  result: result,
                  created_at: m.created_at
                };
              });
              setRecentMatches(mappedMatches);
            }
            if (data.stats) {
              setLiveStats({ wins: data.stats.wins || 0, losses: data.stats.losses || 0 });
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

  const wins = liveStats ? liveStats.wins : (session.wins ?? 0);
  const losses = liveStats ? liveStats.losses : (session.losses ?? 0);
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

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
              <span className={styles.statValue}>{wins}</span>
              <span className={styles.statLabel}>Wins</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{losses}</span>
              <span className={styles.statLabel}>Losses</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{winRate}%</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalGames}</span>
              <span className={styles.statLabel}>Matches</span>
            </div>
          </div>

          <div className={styles.recentSection}>
            <h2>Recent Matches</h2>
            {recentMatches.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.matchesTable}>
                  <thead>
                    <tr>
                      <th>Opponent</th>
                      <th>Result</th>
                      <th className={styles.textRight}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMatches.map(match => (
                      <tr key={match.id}>
                        <td className={styles.opponentCell}>
                          <span className={styles.opponentAvatar}>
                            {match.opponent_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                          <span className={styles.opponentName}>{match.opponent_name}</span>
                        </td>
                        <td>
                          <span className={
                            match.result === 'win' ? styles.winBadge :
                            match.result === 'loss' ? styles.lossBadge :
                            styles.drawBadge
                          }>
                            {match.result.toUpperCase()}
                          </span>
                        </td>
                        <td className={styles.matchDate}>
                          {new Date(match.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.noMatchesContainer}>
                <div className={styles.noMatchesIcon}>⚔️</div>
                <p className={styles.noMatches}>No matches played yet.</p>
                <p className={styles.noMatchesSub}>Play your first game to see your history.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
