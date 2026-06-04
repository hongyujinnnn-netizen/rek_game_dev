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
    piece.role === 'king' ||
    !movesInStraightLine ||
    staysStill ||
    target
  ) {
    return false;
  }

  return isPathClear(board, from, to);
}

function getCustodianCaptureSquares(board: RekBoard, to: Square, player: Player): Square[] {
  const captures: Square[] = [];
  const left = { row: to.row, col: to.col - 1 };
  const right = { row: to.row, col: to.col + 1 };
  const up = { row: to.row - 1, col: to.col };
  const down = { row: to.row + 1, col: to.col };
  const hasEnemy = (square: Square): boolean =>
    isWithinBoard(square) && board[square.row][square.col]?.player !== player && Boolean(board[square.row][square.col]);

  if (hasEnemy(left) && hasEnemy(right)) {
    captures.push(left, right);
  }

  if (hasEnemy(up) && hasEnemy(down)) {
    captures.push(up, down);
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

  return getCustodianCaptureSquares(nextBoard, to, player);
}

function doesMoveCapture(board: RekBoard, from: Square, to: Square, player: Player): boolean {
  return getSplitCapturesForMove(board, from, to, player).length > 0;
}

function hasAnyCapturingMove(board: RekBoard, player: Player): boolean {
  return board.some((row, rowIndex) =>
    row.some((piece, colIndex) => {
      if (!piece || piece.player !== player) {
        return false;
      }

      return Array.from({ length: BOARD_SIZE }, (_, toRow) =>
        Array.from({ length: BOARD_SIZE }, (_, toCol) =>
          doesMoveCapture(board, { row: rowIndex, col: colIndex }, { row: toRow, col: toCol }, player)
        )
      )
        .flat()
        .some(Boolean);
    })
  );
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

  if (hasAnyCapturingMove(board, turn)) {
    return doesMoveCapture(board, from, to, turn);
  }

  return isSameSquare(calledSquare, to);
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

function hasLegalCapturingMoveToSquare(board: RekBoard, square: Square, player: Player): boolean {
  return board.some((row, rowIndex) =>
    row.some((piece, colIndex) =>
      Boolean(
        piece && piece.player === player && doesMoveCapture(board, { row: rowIndex, col: colIndex }, square, player)
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
    hasLegalCapturingMoveToSquare(board, square, forcedPlayer)
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
  onExit,
}: ChessGameProps) {
  const [board, setBoard] = useState<RekBoard>(() => createInitialBoard());
  const [turn, setTurn] = useState<Player>('red');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [gameState, setGameState] = useState<GameState>('active');
  const [winner, setWinner] = useState<Player | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [boardHistory, setBoardHistory] = useState<RekBoard[]>([]);
  const [showMoveHistory, setShowMoveHistory] = useState(true);
  const [calledSquare, setCalledSquare] = useState<Square | null>(null);
  const [callTimer, setCallTimer] = useState<number | null>(null);
  const [playerColor, setPlayerColor] = useState<Player | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState<boolean>(false);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const channelRef = useRef<any>(null);
  const [clientPlayerId] = useState(() =>
    playerName ? `user:${playerName}` : `guest-${Math.random().toString(36).slice(2, 10)}`
  );

  const legalMoves = useMemo(
    () => (callTimer === null ? getLegalMoves(board, selectedSquare, turn, calledSquare) : []),
    [board, callTimer, calledSquare, selectedSquare, turn]
  );

  const applyRemoteState = useCallback(
    (data: GameRoom) => {
      setBoard(deserializeBoard(data.board_state));
      setTurn(data.turn);
      setGameState(data.status === 'finished' ? 'finished' : 'active');
      setWinner(data.winner ?? null);
      setCalledSquare(data.called_square ?? null);
      setMoveHistory(data.move_history ?? []);
      if (data.player_id_red === clientPlayerId) {
        setPlayerColor('red');
      } else if (data.player_id_blue === clientPlayerId) {
        setPlayerColor('blue');
      }

      setWaitingForOpponent(data.status === 'waiting' && (data.player_id_red === clientPlayerId || data.player_id_blue === clientPlayerId));

      setOnlineStatus(data.status === 'waiting' ? 'Waiting for an opponent to join...' : 'Room synced with server');
    },
    [clientPlayerId]
  );


  useEffect(() => {
    if (callTimer === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (callTimer <= 1) {
        setCallTimer(null);
        setCalledSquare(null);
        setSelectedSquare(null);
        setTurn((current) => getNextPlayer(current));
        return;
      }

      setCallTimer(callTimer - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [callTimer]);

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

          console.log('Real-time update received:', payload);
          applyRemoteState(payload.new as GameRoom);
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
    setCallTimer(null);
    setCalledSquare(null);
    setSelectedSquare(null);
    setTurn((current) => getNextPlayer(current));
  }, []);

  const resetGame = useCallback(async (): Promise<void> => {
    setBoard(createInitialBoard());
    setTurn('red');
    setSelectedSquare(null);
    setGameState('active');
    setWinner(null);
    setMoveHistory([]);
    setBoardHistory([]);
    setShowMoveHistory(true);
    setCalledSquare(null);
    setCallTimer(null);

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: createInitialBoard(), turn: 'red', status: 'active', winner: null, called_square: null, move_history: [] } }),
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
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: previousBoard, turn: previousMove?.player ?? 'red', status: 'active', winner: null, called_square: null, move_history: nextHistory } }),
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

    const splitCaptures = getCustodianCaptureSquares(nextBoard, to, piece.player);
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
          body: JSON.stringify({ room_code: roomCode, updates: { board_state: nextBoard, turn: getNextPlayer(piece.player), status: 'finished', winner: piece.player, called_square: null, move_history: nextHistory } }),
        }).catch(() => setOnlineStatus('Unable to sync finished game state.'));
      }
      return;
    }

    const nextTurn = getNextPlayer(piece.player);
    setTurn(nextTurn);
    setCallTimer(30);

    if (isOnline && roomCode) {
      fetch('/api/supabase/games/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, updates: { board_state: nextBoard, turn: nextTurn, status: 'active', winner: null, called_square: null, move_history: nextHistory } }),
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
        if (canCallSquare(board, square, turn)) {
          setCalledSquare(square);
          setCallTimer(null);
          setSelectedSquare(null);
          setTurn(getNextPlayer(turn));

            if (isOnline && roomCode) {
              fetch('/api/supabase/games/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_code: roomCode, updates: { board_state: board, turn: getNextPlayer(turn), status: 'active', winner: null, called_square: square, move_history: moveHistory } }),
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

  const statusMessage = winner
    ? `${getPlayerLabel(winner)} captured the king and wins`
    : calledSquare
      ? `${getPlayerLabel(turn)} must capture; call at ${squareName(calledSquare)}`
      : callTimer !== null
        ? `${getPlayerLabel(turn)} may call: ${callTimer}s`
        : `${getPlayerLabel(turn)} to move`;

  return (
    <div className={styles.container}>
      {isOnline && !hasBrowserKey && (
        <div className={styles.diagnosticBanner} role="status" aria-live="polite">
          Supabase client key missing in browser environment — online features may fail (check env vars).
        </div>
      )}
      <div className={styles.gameInfo}>
        <h1>Leung Rek</h1>
        <div className={styles.modeStatus}>
          <span>{isOnline ? 'Private Room' : 'Pass & Play'}</span>
          {roomCode && <span>Room {roomCode}</span>}
          {playerName && <span>{playerName}</span>}
          {playerColor && isOnline && <span>You are {getPlayerLabel(playerColor)}</span>}
          {roomCode && isOnline && (
            <span>
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => {
                  try {
                    const invite = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                    navigator.clipboard.writeText(invite);
                    setOnlineStatus('Invite link copied to clipboard');
                  } catch (e) {
                    setOnlineStatus('Unable to copy invite link');
                  }
                }}
              >
                Copy invite
              </button>
            </span>
          )}
        </div>
        <div className={styles.status}>{statusMessage}</div>
        {onlineStatus && <div className={styles.status}>{onlineStatus}</div>}
        <div className={styles.buttonGroup}>
          {onExit && (
            <button onClick={onExit} className={styles.exitButton}>
              Home
            </button>
          )}
          <button onClick={resetGame} className={styles.resetButton}>
            New Game
          </button>
          <button
            onClick={undoMove}
            className={styles.undoButton}
            disabled={moveHistory.length === 0}
          >
            Undo Move
          </button>
          {callTimer !== null && (
            <button onClick={endCallWindow} className={styles.callButton}>
              End Call
            </button>
          )}
        </div>
      </div>

      <div className={styles.boardWrapper}>
        {waitingForOpponent && (
          <div className={styles.waitingOverlay} role="status" aria-live="polite">
            <div className={styles.waitingMessage}>
              <div>Waiting for an opponent to join...</div>
              <div style={{ marginTop: 12 }}>
                <button onClick={handleLeaveRoom} className={styles.leaveButton} type="button">
                  Cancel & Leave
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

        {moveHistory.length > 0 && (
          <div className={[styles.moveHistory, showMoveHistory ? '' : styles.moveHistoryCollapsed].join(' ')}>
            <div className={styles.moveHistoryHeader}>
              <div>
                <h3>Move History</h3>
                <span className={styles.moveCount}>
                  {moveHistory.length} {moveHistory.length === 1 ? 'move' : 'moves'}
                </span>
              </div>
              <button
                className={styles.historyToggleButton}
                onClick={() => setShowMoveHistory((current) => !current)}
                type="button"
                aria-expanded={showMoveHistory}
              >
                {showMoveHistory ? 'Hide' : 'Show'}
              </button>
            </div>

            {showMoveHistory && (
              <div className={styles.moveList}>
                {moveHistory.map((move, index) => (
                  <div key={`${move.from}-${move.to}-${index}`} className={styles.moveItem}>
                    <span className={styles.moveNumber}>{index + 1}</span>
                    <span className={styles.moveSan}>
                      {getPlayerLabel(move.player)} {move.piece === 'king' ? 'Sdach' : 'Kon'}{' '}
                      {move.from}-{move.to}
                      {move.captures?.length
                        ? ` x ${move.captures.map(getPieceRoleLabel).join(', ')}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
