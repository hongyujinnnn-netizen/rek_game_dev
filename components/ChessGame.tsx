'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './ChessGame.module.css';
import { GameState, MoveHistoryItem, Player, RekBoard } from '@/types/chess';
import { createClient, hasBrowserKey } from '@/util/supabase/client';

const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

type GameRoom = {
  room_code: string;
  board_state: RekBoard;
  turn: Player;
  status: 'waiting' | 'in_progress' | 'finished' | 'abandoned';
  player_red: string | null;
  player_blue: string | null;
  player_id_red: string | null;
  player_id_blue: string | null;
  called_square: Square | null;
  move_history: MoveHistoryItem[];
  winner: Player | null;
};

type Square = {
  row: number;
  col: number;
};

export type ChessGameProps = {
  isOnline?: boolean;
  roomCode?: string | null;
  playerName?: string | null;
  playerId?: string | null;
  onExit?: () => void;
  isCreator?: boolean;
};

function cloneBoard(board: RekBoard): RekBoard {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function createInitialBoard(): RekBoard {
  const board: RekBoard = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    board[2][col] = { player: 'blue', role: 'commoner' };
    board[5][col] = { player: 'red', role: 'commoner' };

    if (col > 0) {
      board[0][col] = { player: 'blue', role: 'commoner' };
    }

    if (col < BOARD_SIZE - 1) {
      board[7][col] = { player: 'red', role: 'commoner' };
    }
  }

  board[1][0] = { player: 'blue', role: 'king' };
  board[6][7] = { player: 'red', role: 'king' };

  return board;
}

function squareName({ row, col }: Square): string {
  return `${FILES[col]}${BOARD_SIZE - row}`;
}

function isSameSquare(first: Square | null, second: Square): boolean {
  return first?.row === second.row && first.col === second.col;
}

function isWithinBoard({ row, col }: Square): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isPathClear(board: RekBoard, from: Square, to: Square): boolean {
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const movesInStraightLine = rowDelta === 0 || colDelta === 0;

  if (!isWithinBoard(from) || !isWithinBoard(to) || !movesInStraightLine || (rowDelta === 0 && colDelta === 0)) {
    return false;
  }

  const rowStep = Math.sign(rowDelta);
  const colStep = Math.sign(colDelta);
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (board[row][col]) {
      return false;
    }

    row += rowStep;
    col += colStep;
  }

  return true;
}

function isBasicLegalMove(board: RekBoard, from: Square, to: Square, turn: Player): boolean {
  if (!isWithinBoard(from) || !isWithinBoard(to)) {
    return false;
  }

  const piece = board[from.row][from.col];
  const target = board[to.row][to.col];
  const movesInStraightLine = from.row === to.row || from.col === to.col;
  const staysStill = from.row === to.row && from.col === to.col;

  if (
    !piece ||
    piece.player !== turn ||
    piece.role === 'king' ||
    !movesInStraightLine ||
    staysStill ||
    target
  ) {
    return false;
  }

  return isPathClear(board, from, to);
}

function getInterventionCaptureSquares(board: RekBoard, to: Square, player: Player): Square[] {
  const captures: Square[] = [];

  // Check opposing direction pairs: horizontal (left/right) and vertical (up/down).
  // If the piece lands between two enemy pieces on the same axis, both are captured.
  const axes: Array<{ row: number; col: number }[]> = [
    [{ row: 0, col: -1 }, { row: 0, col: 1 }],   // horizontal: left & right
    [{ row: -1, col: 0 }, { row: 1, col: 0 }],    // vertical: up & down
  ];

  for (const [dirA, dirB] of axes) {
    const squareA = { row: to.row + dirA.row, col: to.col + dirA.col };
    const squareB = { row: to.row + dirB.row, col: to.col + dirB.col };

    if (
      isWithinBoard(squareA) &&
      isWithinBoard(squareB) &&
      board[squareA.row][squareA.col] !== null &&
      board[squareA.row][squareA.col]?.player !== player &&
      board[squareB.row][squareB.col] !== null &&
      board[squareB.row][squareB.col]?.player !== player
    ) {
      captures.push(squareA, squareB);
    }
  }

  return captures;
}

function getSplitCapturesForMove(board: RekBoard, from: Square, to: Square, player: Player): Square[] {
  if (!isBasicLegalMove(board, from, to, player)) {
    return [];
  }

  const nextBoard = cloneBoard(board);
  const piece = nextBoard[from.row][from.col];

  if (!piece) {
    return [];
  }

  nextBoard[to.row][to.col] = piece;
  nextBoard[from.row][from.col] = null;

  return getInterventionCaptureSquares(nextBoard, to, player);
}

function doesMoveCapture(board: RekBoard, from: Square, to: Square, player: Player): boolean {
  return getSplitCapturesForMove(board, from, to, player).length > 0;
}


function isLegalMove(
  board: RekBoard,
  from: Square,
  to: Square,
  turn: Player,
  calledSquare: Square | null = null
): boolean {
  if (!isBasicLegalMove(board, from, to, turn)) {
    return false;
  }

  if (!calledSquare) {
    return true;
  }

  // When a square is called, the forced player can either:
  // 1. Move one of their pieces to the called square, OR
  // 2. Make any move that results in a custodian capture (kill).
  if (isSameSquare(to, calledSquare)) {
    return true;
  }

  return doesMoveCapture(board, from, to, turn);
}

function getLegalMoves(
  board: RekBoard,
  from: Square | null,
  turn: Player,
  calledSquare: Square | null = null
): Square[] {
  if (!from) {
    return [];
  }

  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({ row, col }))
  )
    .flat()
    .filter((to) => isLegalMove(board, from, to, turn, calledSquare));
}

function getNextPlayer(player: Player): Player {
  return player === 'red' ? 'blue' : 'red';
}

function getPlayerLabel(player: Player): string {
  return player === 'red' ? 'Red' : 'Blue';
}

function getPieceRoleLabel(role: MoveHistoryItem['piece']): string {
  return role === 'king' ? 'Sdach' : 'Kon';
}

function hasLegalMoveToSquare(board: RekBoard, square: Square, player: Player): boolean {
  return board.some((row, rowIndex) =>
    row.some((piece, colIndex) =>
      Boolean(
        piece && piece.player === player && isBasicLegalMove(board, { row: rowIndex, col: colIndex }, square, player)
      )
    )
  );
}

function canCallSquare(board: RekBoard, square: Square, callingPlayer: Player): boolean {
  const forcedPlayer = getNextPlayer(callingPlayer);

  return (
    isWithinBoard(square) &&
    !board[square.row][square.col] &&
    hasLegalMoveToSquare(board, square, forcedPlayer) &&
    getInterventionCaptureSquares(board, square, forcedPlayer).length > 0
  );
}

function serializeBoard(board: RekBoard): RekBoard {
  return board;
}

function deserializeBoard(board: unknown): RekBoard {
  return board as RekBoard;
}

export default function ChessGame({
  isOnline = false,
  roomCode = null,
  playerName = null,
  playerId = null,
  onExit,
  isCreator = false,
}: ChessGameProps) {
  const [board, setBoard] = useState<RekBoard>(() => createInitialBoard());
  const [turn, setTurn] = useState<Player>('red');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [gameState, setGameState] = useState<GameState>('active');
  const [winner, setWinner] = useState<Player | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [boardHistory, setBoardHistory] = useState<RekBoard[]>([]);
  const [calledSquare, setCalledSquare] = useState<Square | null>(null);
  const [callTimer, setCallTimer] = useState<number | null>(null);
  const [playerColor, setPlayerColor] = useState<Player | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [waitingForRematch, setWaitingForRematch] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState<boolean>(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [redWins, setRedWins] = useState<number>(0);
  const [blueWins, setBlueWins] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const channelRef = useRef<any>(null);
  const gameStateRef = useRef<GameState>(gameState);
  
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [clientPlayerId] = useState(() => {
    if (playerId) return playerId;
    return playerName ? `user:${playerName}` : `guest-${Math.random().toString(36).slice(2, 10)}`;
  });

  const legalMoves = useMemo(
    () => (callTimer === null ? getLegalMoves(board, selectedSquare, turn, calledSquare) : []),
    [board, callTimer, calledSquare, selectedSquare, turn]
  );

  const applyRemoteState = useCallback(
    (data: GameRoom & { call_timer?: number | null }) => {
      try {
        const boardState = typeof data.board_state === 'string' ? JSON.parse(data.board_state) : data.board_state;
        const calledSquareData = typeof data.called_square === 'string' ? JSON.parse(data.called_square) : data.called_square;
        const moveHistoryData = typeof data.move_history === 'string' ? JSON.parse(data.move_history) : (data.move_history ?? []);
        const historyArray = Array.isArray(moveHistoryData) ? moveHistoryData : [];

        if (data.status === 'abandoned') {
          setRoomError('Opponent has left the room.');
          return;
        }
        
        const actualHistory = historyArray.filter((m: any) => m.from !== 'REMATCH');
        const rematchRequests = historyArray.filter((m: any) => m.from === 'REMATCH');

        // Determine which color this client plays
        let myColor: Player | null = null;
        let opponentNameStr: string | null = null;
        if (data.player_id_red === clientPlayerId) {
          myColor = 'red';
          opponentNameStr = data.player_blue;
        } else if (data.player_id_blue === clientPlayerId) {
          myColor = 'blue';
          opponentNameStr = data.player_red;
        }

        if (myColor && rematchRequests.some((m: any) => m.to !== myColor)) {
          setOpponentWantsRematch(true);
        }

        if (opponentNameStr !== undefined) {
          setOpponentName(opponentNameStr);
        }

        // If the server says it's still this player's turn with an active call_timer,
        // and we already have a local callTimer running, skip overwriting — we own
        // this state locally while the call window is open.
        const remoteCallTimer = data.call_timer ?? null;
        const isMyCallWindow = myColor !== null && data.turn === myColor && remoteCallTimer !== null;

        setBoard(deserializeBoard(boardState));
        setMoveHistory(actualHistory);
        const wasFinished = gameStateRef.current === 'finished';
        setGameState(data.status === 'finished' ? 'finished' : 'active');
        setWinner(data.winner ?? null);

        if (data.status === 'in_progress' && actualHistory.length === 0) {
          setWaitingForRematch(false);
          setOpponentWantsRematch(false);
        }

        // The database now automatically handles statistics recording via PostgreSQL trigger 
        // when the game status is updated to 'finished'. No client-side request needed.
        // if (data.status === 'finished' && !wasFinished && isOnline && roomCode) { ... }

        if (!isMyCallWindow) {
          // Safe to apply turn and call state from server
          setTurn(data.turn);
          setCalledSquare(calledSquareData ?? null);
          // Set call timer from remote so the opponent also sees the countdown.
          // This ensures they don't get stuck on "THINKING" and can manage the countdown
          // locally as a fallback if the active player disconnects.
          setCallTimer(remoteCallTimer);
        }
        // else: keep local turn, callTimer, and calledSquare as-is — we're in our call window

        if (myColor) {
          setPlayerColor(myColor);
        }

        setWaitingForOpponent(data.status === 'waiting' && (data.player_id_red === clientPlayerId || data.player_id_blue === clientPlayerId));

        setOnlineStatus(data.status === 'waiting' ? 'Waiting for an opponent to join...' : 'Room synced with server');
      } catch (err) {
        console.error('Error applying remote state:', err);
        setOnlineStatus('Error syncing game state from server');
      }
    },
    [clientPlayerId]
  );


  useEffect(() => {
    if (callTimer === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (callTimer <= 1) {
        const nextTurn = getNextPlayer(turn);

        setCalledSquare(null);
        setSelectedSquare(null);
        setCallTimer(null);
        setTurn(nextTurn);

        // Only the active player (or local game) should sync the timeout to avoid race conditions
        if (isOnline && roomCode && (!playerColor || turn === playerColor)) {
          fetch('/api/supabase/games/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_code: roomCode, updates: { board_state: board, turn: nextTurn, status: 'active', winner: null, called_square: null, move_history: moveHistory, call_timer: null } }),
          }).catch(() => setOnlineStatus('Unable to sync call timeout with online room state.'));
        }

        return;
      }

      setCallTimer(callTimer - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [callTimer, turn, isOnline, roomCode, board, moveHistory, playerColor]);

  // Removed useEffect for /record to avoid race conditions

  useEffect(() => {
    if (!isOnline || !roomCode) {
      return;
    }

    const supabase = createClient();
    let isActive = true;

    const joinOrCreateRoom = async () => {
      const playerLabel = playerName ?? `Guest ${clientPlayerId.slice(6)}`;

      try {
        const res = await fetch(`/api/supabase/games?room=${encodeURIComponent(roomCode!)}`);
        if (!res.ok) {
          setOnlineStatus('Unable to load room details.');
          return;
        }

        const existingRoom = await res.json();

        if (!existingRoom) {
          if (!isCreator) {
            setRoomError('Room not found. Please check the code and try again.');
            return;
          }

          const createRes = await fetch('/api/supabase/games/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_code: roomCode,
              board_state: createInitialBoard(),
              playerName: playerLabel,
              playerId: clientPlayerId,
            }),
          });

          if (!createRes.ok) {
            const errBody = await createRes.text();
            console.error('Create game failed:', createRes.status, errBody);
            setOnlineStatus(`Unable to create the game room: ${errBody}`);
            return;
          }

          const createdRoom = await createRes.json();
          applyRemoteState(createdRoom);
          return;
        }

        if (existingRoom.player_id_red === clientPlayerId) {
          applyRemoteState(existingRoom);
          return;
        }

        if (!existingRoom.player_id_blue) {
          const joinRes = await fetch('/api/supabase/games/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_code: roomCode, playerName: playerLabel, playerId: clientPlayerId }),
          });

          if (!joinRes.ok) {
            setOnlineStatus('Unable to join this room.');
            return;
          }

          const joinedRoom = await joinRes.json();
          applyRemoteState(joinedRoom);
          return;
        }

        const isPlayer =
          existingRoom.player_id_red === clientPlayerId || existingRoom.player_id_blue === clientPlayerId;

        if (isPlayer) {
          applyRemoteState(existingRoom);
        } else {
          setOnlineStatus('Room is already full. You are watching a spectator board.');
        }
      } catch (err) {
        setOnlineStatus('Unable to load room details.');
      }
    };

    joinOrCreateRoom();

    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload) => {
          if (!isActive) return;

          if (payload.eventType === 'DELETE') {
            setRoomError('Opponent has left the room.');
            return;
          }

          if (payload.eventType === 'UPDATE' && payload.new) {
            try {
              console.log('Real-time update received:', payload);
              applyRemoteState(payload.new as GameRoom);
            } catch (err) {
              console.error('Error processing real-time update:', err);
            }
          }
        }
      );

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('Real-time subscription established');
        setRealtimeActive(true);
        setOnlineStatus('Real-time sync active');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Real-time subscription error:', status, err);
        setRealtimeActive(false);
        setOnlineStatus('Real-time sync failed. Using polling as backup...');
      }
    });
    channelRef.current = channel;

    return () => {
      isActive = false;
      setRealtimeActive(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clientPlayerId, isOnline, playerName, roomCode, applyRemoteState]);

  useEffect(() => {
    if (!isOnline || !roomCode) {
      return;
    }

    // Keep polling active as a backup, even when real-time is active
    const intervalId = window.setInterval(async () => {
      if (realtimeActive) return; // Stop wasting bandwidth if socket is healthy
      try {
        const res = await fetch(`/api/supabase/games?room=${encodeURIComponent(roomCode)}`);
        if (!res.ok) {
          return;
        }

        const existingRoom = await res.json();
        if (existingRoom) {
          // Double check realtimeActive just in case it connected while fetching
          if (!realtimeActive) {
            applyRemoteState(existingRoom);
          }
        } else {
          setRoomError('Opponent has left the room.');
          window.clearInterval(intervalId);
        }
      } catch {
        // Silence polling errors
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyRemoteState, isOnline, realtimeActive, roomCode]);


  const endCallWindow = useCallback((): void => {
    // Guard: only advance the turn if the call window is actually open.
    if (callTimer === null) {
      return;
    }

    const nextTurn = getNextPlayer(turn);

    setCalledSquare(null);
    setSelectedSquare(null);
    setCallTimer(null);
    setTurn(nextTurn);

    // Sync the turn change to Supabase so the remote state stays consistent
    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode,
          updates: {
            turn: nextTurn,
            called_square: null,
            call_timer: null,
          },
        }),
      }).catch(() => setOnlineStatus('Unable to sync end-call with online room state.'));
    }
  }, [callTimer, turn, isOnline, roomCode]);

  // Spacebar shortcut to pass the call window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const isMyTurn = !isOnline || turn === playerColor;
        if (callTimer !== null && isMyTurn) {
          e.preventDefault(); // Prevent default page scroll
          endCallWindow();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callTimer, isOnline, turn, playerColor, endCallWindow]);

  const resetGame = useCallback(async (): Promise<void> => {
    setBoard(createInitialBoard());
    setTurn('red');
    setSelectedSquare(null);
    setGameState('active');
    setWinner(null);
    setMoveHistory([]);
    setBoardHistory([]);
    setCalledSquare(null);
    setCallTimer(null);
    setWaitingForRematch(false);
    setOpponentWantsRematch(false);
    setOpponentName(null);

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: createInitialBoard(), turn: 'red', status: 'active', winner: null, called_square: null, call_timer: null, move_history: [] } }),
      })
      .then((res) => {
        if (!res.ok) {
          setRoomError('Opponent has left the room.');
        }
      })
      .catch(() => setOnlineStatus('Unable to reset online room state.'));
    }
  }, [isOnline, roomCode]);

  const handlePlayAgain = useCallback(() => {
    if (!isOnline) {
      resetGame();
      return;
    }

    if (opponentWantsRematch) {
      resetGame();
    } else {
      setWaitingForRematch(true);
      if (roomCode && playerColor) {
        const newHistory = [...moveHistory, { from: 'REMATCH', to: playerColor, piece: null, captures: [] }];
        fetch('/api/supabase/games/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room_code: roomCode, 
            updates: { move_history: newHistory } 
          })
        }).catch(console.error);
      }
    }
  }, [isOnline, opponentWantsRematch, resetGame, moveHistory, playerColor, roomCode]);

  const handleLeaveRoom = useCallback(() => {
    if (isOnline && gameState === 'active' && playerColor && !waitingForOpponent) {
      setShowLeaveConfirm(true);
      return;
    }

    if (isOnline && roomCode) {
      if (waitingForOpponent || gameState === 'finished') {
        fetch('/api/supabase/games/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode, updates: { status: 'abandoned' } }),
          keepalive: true
        }).catch(() => {});

        fetch('/api/supabase/games/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode }),
          keepalive: true
        }).catch(console.error);
      }
    }

    if (onExit) {
      onExit();
      return;
    }

    // Fallback: reset local game state and clear online flags
    resetGame();
    setOnlineStatus('Left the room.');
    setWaitingForOpponent(false);
  }, [gameState, isOnline, onExit, playerColor, resetGame, roomCode, waitingForOpponent]);

  const confirmLeaveAction = useCallback(() => {
    setShowLeaveConfirm(false);
    
    if (isOnline && gameState === 'active' && playerColor && !waitingForOpponent) {
      const opponentColor = playerColor === 'red' ? 'blue' : 'red';

      if (roomCode) {
        fetch('/api/supabase/games/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room_code: roomCode, 
            updates: { 
              status: 'finished', 
              winner: opponentColor, 
              call_timer: null,
            } 
          }),
        })
        .then(() => {
          setTimeout(() => {
            fetch('/api/supabase/games/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room_code: roomCode })
            }).catch(console.error);
          }, 2500);
        })
        .catch(() => console.error('Failed to update game state to finished'));
      }
    }

    if (onExit) {
      onExit();
      return;
    }

    resetGame();
    setOnlineStatus('Left the room.');
    setWaitingForOpponent(false);
  }, [gameState, isOnline, onExit, playerColor, resetGame, roomCode, waitingForOpponent]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOnline && gameState === 'active' && playerColor && !waitingForOpponent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleUnload = () => {
      if (isOnline && waitingForOpponent && roomCode) {
        fetch('/api/supabase/games/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode }),
          keepalive: true,
        }).catch(() => {});
        return;
      }

      if (isOnline && gameState === 'active' && playerColor && !waitingForOpponent && roomCode) {
        const opponentColor = playerColor === 'red' ? 'blue' : 'red';
        
        fetch('/api/supabase/games/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room_code: roomCode, 
            updates: { 
              status: 'finished', 
              winner: opponentColor, 
              call_timer: null,
            } 
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isOnline, gameState, playerColor, waitingForOpponent, roomCode]);

  const undoMove = useCallback((): void => {
    const previousBoard = boardHistory.at(-1);
    const previousMove = moveHistory.at(-1);

    if (!previousBoard) {
      return;
    }

    const nextHistory = moveHistory.slice(0, -1);

    setBoard(previousBoard);
    setBoardHistory((prev) => prev.slice(0, -1));
    setMoveHistory(nextHistory);
    setTurn(previousMove?.player ?? 'red');
    setSelectedSquare(null);
    setGameState('active');
    setWinner(null);
    setCalledSquare(null);
    setCallTimer(null);

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: previousBoard, turn: previousMove?.player ?? 'red', status: 'active', winner: null, called_square: null, call_timer: null, move_history: nextHistory } }),
      }).catch(() => setOnlineStatus('Unable to sync undo with online room state.'));
    }
  }, [boardHistory, moveHistory, isOnline, roomCode]);

  const makeMove = useCallback((from: Square, to: Square): void => {
    if (!isLegalMove(board, from, to, turn, calledSquare)) {
      return;
    }

    const nextBoard = cloneBoard(board);
    const piece = nextBoard[from.row][from.col];
    const captured = nextBoard[to.row][to.col];

    if (!piece) {
      return;
    }

    if (isOnline && playerColor && turn !== playerColor) {
      setOnlineStatus('It is not your turn.');
      return;
    }

    nextBoard[to.row][to.col] = piece;
    nextBoard[from.row][from.col] = null;

    const splitCaptures = getInterventionCaptureSquares(nextBoard, to, piece.player);
    const capturedRoles: MoveHistoryItem['piece'][] = captured ? [captured.role] : [];

    splitCaptures.forEach((square) => {
      const splitCaptured = nextBoard[square.row][square.col];

      if (splitCaptured) {
        capturedRoles.push(splitCaptured.role);
      }

      nextBoard[square.row][square.col] = null;
    });

    const nextMove = {
      from: squareName(from),
      to: squareName(to),
      piece: piece.role,
      player: piece.player,
      captured: capturedRoles[0],
      captures: capturedRoles,
    };
    const nextHistory = [...moveHistory, nextMove];

    setBoardHistory((prev) => [...prev, cloneBoard(board)]);
    setBoard(nextBoard);
    setMoveHistory(nextHistory);
    setSelectedSquare(null);
    setCalledSquare(null);

    if (capturedRoles.includes('king')) {
      if (piece.player === 'red') setRedWins(prev => prev + 1);
      if (piece.player === 'blue') setBlueWins(prev => prev + 1);
      setCallTimer(null);
      setWinner(piece.player);
      setGameState('finished');
      if (isOnline && roomCode) {
        fetch('/api/supabase/games/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode, updates: { board_state: nextBoard, turn: getNextPlayer(piece.player), status: 'finished', winner: piece.player, called_square: null, call_timer: null, move_history: nextHistory } }),
        })
        .catch(() => setOnlineStatus('Unable to sync finished game state.'));
      }
      return;
    }

    // Don't switch turn yet — the player who just moved gets a 5s call window
    setCallTimer(5);

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: nextBoard, turn: piece.player, status: 'active', winner: null, called_square: null, move_history: nextHistory, call_timer: 5 } }),
      }).catch(() => setOnlineStatus('Unable to sync move with online room state.'));
    }
  }, [board, calledSquare, isOnline, moveHistory, playerColor, roomCode, turn]);

  const handleSquareClick = useCallback(
    (square: Square): void => {
      if (gameState === 'finished') {
        return;
      }

      if (isOnline && playerColor === null) {
        setOnlineStatus('Connecting to room...');
        return;
      }

      if (callTimer !== null) {
        // In online mode, only the calling player (whose turn it is) can make a call
        if (isOnline && playerColor && turn !== playerColor) {
          return;
        }

        if (canCallSquare(board, square, turn)) {
          const forcedTurn = getNextPlayer(turn);
          setCalledSquare(square);
          setCallTimer(null);
          setSelectedSquare(null);
          setTurn(forcedTurn);

          if (isOnline && roomCode) {
            fetch('/api/supabase/games/update', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room_code: roomCode, updates: { board_state: board, turn: forcedTurn, status: 'active', winner: null, called_square: square, move_history: moveHistory, call_timer: null } }),
            }).catch(() => setOnlineStatus('Unable to sync call state.'));
          }
        }

        return;
      }

      if (isOnline && playerColor && turn !== playerColor) {
        setOnlineStatus('Waiting for the other player to move.');
        return;
      }

      const piece = board[square.row][square.col];

      if (selectedSquare && isLegalMove(board, selectedSquare, square, turn, calledSquare)) {
        makeMove(selectedSquare, square);
        return;
      }

      if (piece?.player === turn) {
        setSelectedSquare(square);
        return;
      }

      setSelectedSquare(null);
    },
    [board, callTimer, calledSquare, gameState, isOnline, makeMove, moveHistory, playerColor, roomCode, selectedSquare, turn]
  );

  // Determine the opponent label for the top-right card
  const opponentLabel = (() => {
    if (!isOnline) return turn === 'red' ? 'Blue Player' : 'Red Player';
    if (opponentName) return opponentName;
    if (!playerColor) return 'Opponent';
    return playerColor === 'red' ? 'Blue' : 'Red';
  })();

  const isMyTurn = !isOnline || turn === playerColor;

  return (
    <div className={styles.arenaWrapper}>
      {/* Diagnostic banner */}
      {isOnline && !hasBrowserKey && (
        <div className={styles.diagnosticBanner} role="status" aria-live="polite">
          Supabase key missing — online features may not work.
        </div>
      )}

      {/* ================= BACKGROUND MONOLITH ================= */}
      <svg className={styles.monolithKing} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,20H5V22H19V20M17,14C17,15.66 15.66,17 14,17H10C8.34,17 7,15.66 7,14C7,12.78 7.74,11.73 8.82,11.23L7.1,7.24L9.46,8.23L11.08,4.45C10.74,4.24 10.5,3.88 10.5,3.46C10.5,2.65 11.17,1.96 12,1.96C12.83,1.96 13.5,2.65 13.5,3.46C13.5,3.88 13.26,4.24 12.92,4.45L14.54,8.23L16.9,7.24L15.18,11.23C16.26,11.73 17,12.78 17,14Z" />
      </svg>

      {/* ================= CENTRAL VS BAR ================= */}
      <div className={styles.vsContainer}>
        {/* RED PLAYER (LEFT WING) */}
        <div className={`${styles.playerWing} ${styles.redWing} ${turn === 'red' ? styles.activeWing : styles.inactiveWing}`}>
          <div className={styles.playerInfo}>
            <span className={`${styles.dot} ${styles.bgRed}`}></span>
            <span className={styles.playerName}>
              {isOnline ? (playerColor === 'red' ? (playerName || 'You') : opponentLabel) : 'Red Player'}
            </span>
          </div>
          <div className={`${styles.timer} ${callTimer !== null && turn === 'red' ? styles.timerAlert : ''}`}>
            {callTimer !== null && turn === 'red'
              ? `00:${callTimer.toString().padStart(2, '0')}`
              : turn === 'red' ? 'YOUR TURN' : '--:--'}
          </div>
        </div>

        {/* SCOREBOARD BADGE */}
        <div className={styles.scoreboardBadge}>
          <span className={`${styles.scoreNumber} ${styles.scoreRed}`}>{redWins}</span>
          <span className={styles.scoreDivider}>VS</span>
          <span className={`${styles.scoreNumber} ${styles.scoreBlue}`}>{blueWins}</span>
        </div>

        {/* BLUE PLAYER (RIGHT WING) */}
        <div className={`${styles.playerWing} ${styles.blueWing} ${turn === 'blue' ? styles.activeWing : styles.inactiveWing}`}>
          <div className={`${styles.timer} ${callTimer !== null && turn === 'blue' ? styles.timerAlert : ''}`}>
            {callTimer !== null && turn === 'blue'
              ? `00:${callTimer.toString().padStart(2, '0')}`
              : turn === 'blue' ? 'YOUR TURN' : '--:--'}
          </div>
          <div className={styles.playerInfo}>
            <span className={styles.playerName}>
              {isOnline ? (playerColor === 'blue' ? (playerName || 'You') : opponentLabel) : 'Blue Player'}
            </span>
            <span className={`${styles.dot} ${styles.bgBlue}`}></span>
          </div>
        </div>
      </div>

      {/* CENTERED INLINE CALL BUTTON */}
      {callTimer !== null && isMyTurn && (
        <button onClick={endCallWindow} className={styles.passCallBtn}>
          Pass Call Window
        </button>
      )}

      {/* ================= CENTER: MAIN GAME BOARD ================= */}
      <main className={styles.centerStage}>
        {calledSquare && (
          <div className={styles.matchAlertBanner}>
            ⚡ Forced Move: {squareName(calledSquare).toUpperCase()} or Capture!
          </div>
        )}

        <div className={styles.boardWrapper}>
          {waitingForOpponent && !roomError && (
            <div className={styles.waitingOverlay} role="status" aria-live="polite">
              <div className={styles.waitingMessage}>
                <div>Waiting for an opponent to join…</div>
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleLeaveRoom} className={styles.leaveButton} type="button">
                    Cancel &amp; Leave
                  </button>
                </div>
              </div>
            </div>
          )}

          {roomError && (
            <div className={styles.waitingOverlay} role="status" aria-live="polite">
              <div className={styles.waitingMessage}>
                <div>{roomError}</div>
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleLeaveRoom} className={styles.leaveButton} type="button">
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.board} role="grid" aria-label="Leung Rek board">
            {(playerColor === 'blue' ? [...board].reverse() : board).map((row, renderedRowIndex) => {
              const rowIndex = playerColor === 'blue' ? BOARD_SIZE - 1 - renderedRowIndex : renderedRowIndex;
              return (playerColor === 'blue' ? [...row].reverse() : row).map((piece, renderedColIndex) => {
                const colIndex = playerColor === 'blue' ? BOARD_SIZE - 1 - renderedColIndex : renderedColIndex;
                const square = { row: rowIndex, col: colIndex };
                const selected = isSameSquare(selectedSquare, square);
                const called = isSameSquare(calledSquare, square);
                const legal = legalMoves.some((move) => isSameSquare(move, square));
                const capturable = legal && Boolean(piece && piece.player !== turn);

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className={[
                      styles.square,
                      (rowIndex + colIndex) % 2 === 0 ? styles.lightSquare : styles.darkSquare,
                      selected ? styles.selectedSquare : '',
                      called ? styles.calledSquare : '',
                      legal ? styles.legalSquare : '',
                      capturable ? styles.captureSquare : '',
                    ].join(' ')}
                    onClick={() => handleSquareClick(square)}
                    type="button"
                    role="gridcell"
                    aria-label={squareName(square)}
                  >
                    {piece && (
                      <div className={`${styles.piece} ${styles[piece.player]}`}>
                        <div className={styles.pieceShadow}></div>
                        <div className={styles.pieceInner}>
                          <div className={styles.pieceHighlight}></div>
                          <span className={`${styles.pieceRole} ${piece.role === 'king' ? styles.roleKing : styles.roleCommoner}`}>
                            {piece.role === 'king' ? '♔' : '♙'}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              });
            })}
          </div>
        </div>
      </main>

      {/* ================= GAME OVER OVERLAY ================= */}
      {gameState === 'finished' && winner && !roomError && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverCard}>
            <h2 className={styles.gameOverTitle}>
              {moveHistory.at(-1)?.captures?.includes('king') ? 'Game End' : 'Player Leave'}
            </h2>
            <p className={styles.gameOverSubtitle}>
              {isOnline && playerColor
                ? (winner === playerColor ? 'You Win the matches...' : 'You lose the matches...')
                : `${getPlayerLabel(winner)} captured the king and wins!`}
            </p>
            <div className={styles.gameOverActions}>
              {(!isOnline || moveHistory.at(-1)?.captures?.includes('king')) && (
                <button 
                  onClick={handlePlayAgain} 
                  disabled={waitingForRematch}
                  className={`${styles.gameOverBtn} ${styles.gameOverBtnPrimary}`}
                  style={waitingForRematch ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  {waitingForRematch 
                    ? '⏳ Waiting for opponent...' 
                    : opponentWantsRematch 
                      ? '✅ Accept Rematch' 
                      : '🔄 Play Again'}
                </button>
              )}
              {onExit && (
                <button onClick={handleLeaveRoom} className={`${styles.gameOverBtn} ${styles.gameOverBtnSecondary}`}>
                  🏠 Home
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= LEAVE CONFIRM OVERLAY ================= */}
      {showLeaveConfirm && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverCard}>
            <h2 className={styles.gameOverTitle} style={{ background: 'none', WebkitTextFillColor: 'initial', color: '#e74c3c' }}>Leave Game?</h2>
            <p className={styles.gameOverSubtitle}>
              Are you sure you want to leave?<br />You will automatically lose the match.
            </p>
            <div className={styles.gameOverActions}>
              <button onClick={confirmLeaveAction} className={`${styles.gameOverBtn} ${styles.gameOverBtnPrimary}`} style={{ background: 'rgba(231, 76, 60, 0.15)', borderColor: 'rgba(231, 76, 60, 0.3)', color: '#e74c3c' }}>
                Yes, Leave
              </button>
              <button onClick={() => setShowLeaveConfirm(false)} className={`${styles.gameOverBtn} ${styles.gameOverBtnSecondary}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM LEFT: UNDO ================= */}
      <div className={styles.bottomLeftCorner}>
        <button
          onClick={undoMove}
          className={styles.iconCornerBtn}
          disabled={moveHistory.length === 0 || isOnline}
          title="Undo Move"
        >
          ↩
        </button>
      </div>

      {/* ================= BOTTOM RIGHT: HOME ================= */}
      <div className={styles.bottomRightCorner}>
        {onExit && (
          <button onClick={handleLeaveRoom} className={styles.iconCornerBtn} title="Return to Main Menu">
            🏠
          </button>
        )}
      </div>

      {/* ================= RIGHT SIDEBAR ================= */}
      <aside className={`${styles.rightSidebar} ${!isSidebarOpen ? styles.sidebarClosed : ''}`}>
        <button 
          className={styles.sidebarToggleBtn} 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          {isSidebarOpen ? '▶' : '◀'}
        </button>
        <div className={styles.sidebarSection}>
          <span className={styles.sidebarLabel}>ROOM</span>
          <div className={styles.roomTag}>{roomCode || 'LOCAL'}</div>

          {roomCode && isOnline && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomCode).then(() => setOnlineStatus('Code Copied!'));
              }}
              className={styles.sidebarActionBtn}
            >
              🔗 Copy
            </button>
          )}
        </div>

        <div className={styles.sidebarDivider}></div>

        <button onClick={resetGame} className={styles.sidebarActionBtn}>
          🔄 New
        </button>

        <div className={styles.sidebarDivider}></div>

        {/* Move History in sidebar */}
        <div className={styles.sidebarHistory}>
          <div className={styles.historyTitle}>Moves ({moveHistory.length})</div>
          <div className={styles.miniMoveList}>
            {moveHistory.map((m, idx) => (
              <div key={idx} className={styles.miniMoveRow}>
                <span>{idx + 1}.</span>
                <span>{m.from}→{m.to}</span>
              </div>
            ))}
          </div>
        </div>

        {onlineStatus && <div className={styles.sidebarStatusToast}>{onlineStatus}</div>}
      </aside>
    </div>
  );
}
