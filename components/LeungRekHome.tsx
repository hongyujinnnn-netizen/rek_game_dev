'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import ChessGame2 from './ChessGame_2';
import styles from './LeungRekHome.module.css';

type GameConfig = {
  isOnline: boolean;
  roomCode: string | null;
};

type PlayerSession = {
  id: string;
  email: string | null;
  name: string;
  wins: number | null;
  losses: number | null;
};

type SessionResponse = {
  configured?: boolean;
  error?: string;
  session: PlayerSession | null;
};

function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

async function postAuth(path: string, body?: Record<string, string>): Promise<SessionResponse> {
  const response = await fetch(path, {
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    method: 'POST',
  });
  const payload = (await response.json()) as SessionResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? 'Authentication request failed.');
  }

  return payload;
}

export default function LeungRekHome() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authConfigured, setAuthConfigured] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);

  const normalizedRoomCode = useMemo(() => roomCode.trim().toUpperCase(), [roomCode]);

  useEffect(() => {
    let mounted = true;

    fetch('/api/auth/session')
      .then((response) => response.json() as Promise<SessionResponse>)
      .then((payload) => {
        if (!mounted) {
          return;
        }

        setAuthConfigured(payload.configured !== false);
        setSession(payload.session);
        setAuthError(payload.configured === false ? 'Connect Supabase environment variables to enable accounts.' : null);
      })
      .catch(() => {
        if (mounted) {
          setAuthError('Unable to load account session.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const name = String(formData.get('name') ?? '');

    try {
      const payload = await postAuth(authMode === 'login' ? '/api/auth/login' : '/api/auth/signup', {
        email,
        password,
        ...(authMode === 'signup' ? { name } : {}),
      });

      setSession(payload.session);
      event.currentTarget.reset();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      await postAuth('/api/auth/logout');
      setSession(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (gameConfig) {
    return (
      <ChessGame2
        isOnline={gameConfig.isOnline}
        roomCode={gameConfig.roomCode}
        playerName={session?.name ?? null}
        onExit={() => setGameConfig(null)}
      />
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.playPanel} aria-label="Choose game mode">
        <div className={styles.brandBlock}>
          <p className={styles.kicker}>Traditional strategy board</p>
          <h1>Leung Rek</h1>
          <p className={styles.summary}>Choose a table, invite a friend, and play with local or room-based state.</p>
        </div>

        <div className={styles.modeGrid}>
          <button className={styles.modeCard} onClick={() => setGameConfig({ isOnline: false, roomCode: null })}>
            <span className={styles.modeTitle}>Pass & Play</span>
            <span className={styles.modeText}>Local board state on this device.</span>
          </button>

          <button
            className={styles.modeCard}
            onClick={() => setGameConfig({ isOnline: true, roomCode: createRoomCode() })}
          >
            <span className={styles.modeTitle}>Create Private Room</span>
            <span className={styles.modeText}>Generate a room code for an online match.</span>
          </button>
        </div>

        <form
          className={styles.roomJoin}
          onSubmit={(event) => {
            event.preventDefault();

            if (normalizedRoomCode) {
              setGameConfig({ isOnline: true, roomCode: normalizedRoomCode });
            }
          }}
        >
          <label htmlFor="roomCode">Join Room</label>
          <div className={styles.joinControls}>
            <input
              id="roomCode"
              maxLength={12}
              onChange={(event) => setRoomCode(event.target.value)}
              placeholder="ROOM CODE"
              value={roomCode}
            />
            <button disabled={!normalizedRoomCode} type="submit">
              Join
            </button>
          </div>
        </form>
      </section>

      <aside className={styles.accountPanel} aria-label="Player account">
        <div className={styles.accountHeader}>
          <h2>Player Profile</h2>
          <span>{authConfigured ? 'Session linked' : 'Auth offline'}</span>
        </div>

        {session ? (
          <div className={styles.profileCard}>
            <div>
              <p className={styles.profileName}>{session.name}</p>
              <p className={styles.profileEmail}>{session.email ?? 'No email on profile'}</p>
            </div>
            <div className={styles.statsGrid}>
              <span>
                <strong>{session.wins ?? '-'}</strong>
                Wins
              </span>
              <span>
                <strong>{session.losses ?? '-'}</strong>
                Losses
              </span>
            </div>
            <button className={styles.secondaryButton} disabled={authLoading} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        ) : (
          <form className={styles.authForm} onSubmit={handleAuthSubmit}>
            <div className={styles.authTabs}>
              <button
                className={authMode === 'login' ? styles.activeTab : ''}
                onClick={() => setAuthMode('login')}
                type="button"
              >
                Login
              </button>
              <button
                className={authMode === 'signup' ? styles.activeTab : ''}
                onClick={() => setAuthMode('signup')}
                type="button"
              >
                Register
              </button>
            </div>

            {authMode === 'signup' && (
              <label>
                Player name
                <input name="name" required />
              </label>
            )}
            <label>
              Email
              <input name="email" required type="email" />
            </label>
            <label>
              Password
              <input minLength={6} name="password" required type="password" />
            </label>
            <button disabled={authLoading || !authConfigured} type="submit">
              {authLoading ? 'Working...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        {authError && <p className={styles.authMessage}>{authError}</p>}
      </aside>
    </main>
  );
}
