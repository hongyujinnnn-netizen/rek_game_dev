'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import ChessGame2 from './ChessGame_2';
import Navbar from '@/components/Navbar';
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

export default function LeungRekHome() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState<PlayerSession | null>(null);
  
  // Modal states
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const normalizedRoomCode = useMemo(() => roomCode.trim().toUpperCase(), [roomCode]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session')
      .then((response) => response.json() as Promise<SessionResponse>)
      .then((payload) => {
        if (mounted) setSession(payload.session);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (gameConfig) {
    return (
      <ChessGame2
        isOnline={gameConfig.isOnline}
        roomCode={gameConfig.roomCode}
        playerName={session?.name ?? null}
        playerId={session?.id ?? null}
        onExit={() => setGameConfig(null)}
      />
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.shell}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Leung Rek</h1>
          
          <div className={styles.heroDivider}>
            <div className={styles.heroDividerLine}></div>
            <div className={styles.heroDividerDot}></div>
          </div>
          
          <p className={styles.heroSubtitle}>
            Traditional strategy board reimagined. One of the best competitive platforms for kids and adults.
          </p>
          
          <div className={styles.heroActions}>
            <button 
              className={styles.btnPrimary}
              onClick={() => setShowPlayModal(true)}
            >
              Play Now
            </button>
            <button 
              className={styles.btnSecondary}
              onClick={() => setShowJoinModal(true)}
            >
              Join Room
              <svg className={styles.playIcon} viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Play Modal */}
      {showPlayModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPlayModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowPlayModal(false)}>&times;</button>
            <h2 className={styles.modalTitle}>CHOOSE MODE</h2>
            
            <button 
              className={styles.modeCard} 
              onClick={() => setGameConfig({ isOnline: false, roomCode: null })}
            >
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
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowJoinModal(false)}>&times;</button>
            <h2 className={styles.modalTitle}>JOIN ROOM</h2>
            
            <form
              className={styles.roomJoin}
              onSubmit={(event) => {
                event.preventDefault();
                if (normalizedRoomCode) {
                  setGameConfig({ isOnline: true, roomCode: normalizedRoomCode });
                }
              }}
            >
              <label htmlFor="roomCode">Enter your 6-character room code</label>
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
          </div>
        </div>
      )}
    </>
  );
}
