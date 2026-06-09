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
  status: 'waiting' | 'in_progress' | 'finished';
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
    hasLegalMoveToSquare(board, square, forcedPlayer)
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
  const [waitingForOpponent, setWaitingForOpponent] = useState<boolean>(false);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const channelRef = useRef<any>(null);
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

        // Determine which color this client plays
        let myColor: Player | null = null;
        if (data.player_id_red === clientPlayerId) {
          myColor = 'red';
        } else if (data.player_id_blue === clientPlayerId) {
          myColor = 'blue';
        }

        // If the server says it's still this player's turn with an active call_timer,
        // and we already have a local callTimer running, skip overwriting — we own
        // this state locally while the call window is open.
        const remoteCallTimer = data.call_timer ?? null;
        const isMyCallWindow = myColor !== null && data.turn === myColor && remoteCallTimer !== null;

        setBoard(deserializeBoard(boardState));
        setMoveHistory(Array.isArray(moveHistoryData) ? moveHistoryData : []);
        setGameState(data.status === 'finished' ? 'finished' : 'active');
        setWinner(data.winner ?? null);

        if (!isMyCallWindow) {
          // Safe to apply turn and call state from server
          setTurn(data.turn);
          setCalledSquare(calledSquareData ?? null);
          // If the remote has a call_timer set (opponent is in their call window),
          // don't start a local timer — the opponent's client manages the countdown.
          // Only clear callTimer if the server says null.
          if (remoteCallTimer === null) {
            setCallTimer(null);
          }
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

        if (isOnline && roomCode) {
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
  }, [callTimer, turn, isOnline, roomCode, board, moveHistory]);

  useEffect(() => {
    if (gameState === 'finished' && isOnline && roomCode) {
      fetch('/api/supabase/stats/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode })
      }).catch(err => console.error('Failed to record stats', err));
    }
  }, [gameState, isOnline, roomCode]);

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
            setOnlineStatus('Unable to create the game room.');
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
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload) => {
          if (!isActive || !payload.new) {
            return;
          }

          try {
            console.log('Real-time update received:', payload);
            applyRemoteState(payload.new as GameRoom);
          } catch (err) {
            console.error('Error processing real-time update:', err);
          }
        }
      )
      .on('system', { event: 'subscribe' }, () => {
        console.log('Real-time subscription established');
        setRealtimeActive(true);
        setOnlineStatus('Real-time sync active');
      })
      .on('system', { event: 'error' }, (err) => {
        console.error('Real-time subscription error:', err);
        setRealtimeActive(false);
        setOnlineStatus('Real-time sync failed. Using polling as backup...');
      });

    channel.subscribe();
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
      try {
        const res = await fetch(`/api/supabase/games?room=${encodeURIComponent(roomCode)}`);
        if (!res.ok) {
          return;
        }

        const existingRoom = await res.json();
        if (existingRoom) {
          // Only update if real-time isn't active to avoid double updates
          if (!realtimeActive) {
            applyRemoteState(existingRoom);
          }
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

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: createInitialBoard(), turn: 'red', status: 'active', winner: null, called_square: null, call_timer: null, move_history: [] } }),
      }).catch(() => setOnlineStatus('Unable to reset online room state.'));
    }
  }, [isOnline, roomCode]);

  const handleLeaveRoom = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }

    // Fallback: reset local game state and clear online flags
    resetGame();
    setOnlineStatus('Left the room.');
    setWaitingForOpponent(false);
  }, [onExit, resetGame]);

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
      setCallTimer(null);
      setWinner(piece.player);
      setGameState('finished');
      if (isOnline && roomCode) {
        fetch('/api/supabase/games/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: roomCode, updates: { board_state: nextBoard, turn: getNextPlayer(piece.player), status: 'finished', winner: piece.player, called_square: null, call_timer: null, move_history: nextHistory } }),
        }).catch(() => setOnlineStatus('Unable to sync finished game state.'));
      }
      return;
    }

    // Don't switch turn yet — the player who just moved gets a 30s call window
    setCallTimer(30);

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: nextBoard, turn: piece.player, status: 'active', winner: null, called_square: null, move_history: nextHistory, call_timer: 30 } }),
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

      {/* ================= TOP LEFT: PLAYER ONE (YOU) ================= */}
      <div className={`${styles.playerCard} ${styles.topLeftPlayer} ${isMyTurn ? styles.activeTurn : ''}`}>
        <div className={styles.profileHeader}>
          <span className={`${styles.badge} ${playerColor === 'blue' ? styles.blueBadge : styles.redBadge}`}></span>
          <span className={styles.username}>{playerName || (isOnline ? 'You' : getPlayerLabel(turn))}</span>
        </div>
        {isOnline && playerColor && (
          <span className={styles.playerMeta}>{getPlayerLabel(playerColor)} • {isOnline ? 'Online' : 'Local'}</span>
        )}

        {/* Chess Clock */}
        <div className={`${styles.chessClock} ${callTimer !== null && isMyTurn ? styles.clockAlert : ''}`}>
          {callTimer !== null && isMyTurn
            ? `00:${callTimer.toString().padStart(2, '0')}`
            : isMyTurn ? 'YOUR TURN' : '--:--'}
        </div>

        {/* Inline call action */}
        {callTimer !== null && isMyTurn && (
          <button onClick={endCallWindow} className={styles.inlineCallBtn}>
            Pass Call Window
          </button>
        )}
      </div>

      {/* ================= TOP RIGHT: PLAYER TWO (OPPONENT) ================= */}
      <div className={`${styles.playerCard} ${styles.topRightPlayer} ${!isMyTurn ? styles.activeTurn : ''}`}>
        <div className={styles.profileHeader}>
          <span className={`${styles.badge} ${playerColor === 'blue' ? styles.redBadge : styles.blueBadge}`}></span>
          <span className={styles.username}>{opponentLabel}</span>
        </div>
        <div className={`${styles.chessClock} ${callTimer !== null && !isMyTurn ? styles.clockAlert : ''}`}>
          {callTimer !== null && !isMyTurn
            ? `00:${callTimer.toString().padStart(2, '0')}`
            : !isMyTurn ? 'THINKING' : '--:--'}
        </div>
      </div>

      {/* ================= CENTER: MAIN GAME BOARD ================= */}
      <main className={styles.centerStage}>
        {calledSquare && (
          <div className={styles.matchAlertBanner}>
            ⚡ Forced Move: {squareName(calledSquare).toUpperCase()} or Capture!
          </div>
        )}

        <div className={styles.boardWrapper}>
          {waitingForOpponent && (
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

          <div className={styles.board} role="grid" aria-label="Leung Rek board">
            {board.map((row, rowIndex) =>
              row.map((piece, colIndex) => {
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
                      <span className={`${styles.piece} ${styles[piece.player]}`}>
                        <span className={styles.pieceRole}>
                          {piece.role === 'king' ? 'SD' : 'KON'}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ================= GAME OVER OVERLAY ================= */}
      {gameState === 'finished' && winner && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverCard}>
            <h2 className={styles.gameOverTitle}>Game Over</h2>
            <p className={styles.gameOverSubtitle}>
              {getPlayerLabel(winner)} captured the king and wins!
            </p>
            <div className={styles.gameOverActions}>
              <button onClick={resetGame} className={`${styles.gameOverBtn} ${styles.gameOverBtnPrimary}`}>
                🔄 Play Again
              </button>
              {onExit && (
                <button onClick={onExit} className={`${styles.gameOverBtn} ${styles.gameOverBtnSecondary}`}>
                  🏠 Home
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM LEFT: UNDO ================= */}
      <div className={styles.bottomLeftCorner}>
        <button
          onClick={undoMove}
          className={styles.iconCornerBtn}
          disabled={moveHistory.length === 0}
          title="Undo Move"
        >
          ↩
        </button>
      </div>

      {/* ================= BOTTOM RIGHT: HOME ================= */}
      <div className={styles.bottomRightCorner}>
        {onExit && (
          <button onClick={onExit} className={styles.iconCornerBtn} title="Return to Main Menu">
            🏠
          </button>
        )}
      </div>

      {/* ================= RIGHT SIDEBAR ================= */}
      <aside className={styles.rightSidebar}>
        <div className={styles.sidebarSection}>
          <span className={styles.sidebarLabel}>ROOM</span>
          <div className={styles.roomTag}>{roomCode || 'LOCAL'}</div>

          {roomCode && isOnline && (
            <button
              onClick={() => {
                const invite = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                navigator.clipboard.writeText(invite).then(() => setOnlineStatus('Link Copied!'));
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
