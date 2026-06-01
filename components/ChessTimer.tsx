'use client';

import { useState, useEffect } from 'react';

interface ChessTimerProps {
  isActive: boolean;
  player: 'white' | 'black';
  turn: 'w' | 'b';
  onTimeOut: () => void;
}

export default function ChessTimer({ 
  isActive, 
  player, 
  turn, 
  onTimeOut 
}: ChessTimerProps) {
  const [time, setTime] = useState<number>(300); // 5 minutes in seconds
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && ((player === 'white' && turn === 'w') || (player === 'black' && turn === 'b'))) {
      interval = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, player, turn, onTimeOut]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`timer ${((player === 'white' && turn === 'w') || (player === 'black' && turn === 'b')) ? 'active' : ''}`}>
      <span className="player">{player}</span>
      <span className="time">{formatTime(time)}</span>
    </div>
  );
}
