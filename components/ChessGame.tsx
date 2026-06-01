'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './ChessGame.module.css';
import { GameState, MoveHistoryItem, Player, RekBoard } from '@/types/chess';

const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

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

  const legalMoves = useMemo(
    () => (callTimer === null ? getLegalMoves(board, selectedSquare, turn, calledSquare) : []),
    [board, callTimer, calledSquare, selectedSquare, turn]
  );

  useEffect(() => {
    if (callTimer === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (callTimer <= 1) {
        setCallTimer(null);
        setSelectedSquare(null);
        setTurn((current) => getNextPlayer(current));
        return;
      }

      setCallTimer(callTimer - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [callTimer]);

  const endCallWindow = useCallback((): void => {
    setCallTimer(null);
    setSelectedSquare(null);
    setTurn((current) => getNextPlayer(current));
  }, []);

  const resetGame = useCallback((): void => {
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
  }, []);

  const undoMove = useCallback((): void => {
    const previousBoard = boardHistory.at(-1);
    const previousMove = moveHistory.at(-1);

    if (!previousBoard) {
      return;
    }

    setBoard(previousBoard);
    setBoardHistory((prev) => prev.slice(0, -1));
    setMoveHistory((prev) => prev.slice(0, -1));
    setTurn(previousMove?.player ?? 'red');
    setSelectedSquare(null);
    setGameState('active');
    setWinner(null);
    setCalledSquare(null);
    setCallTimer(null);
  }, [boardHistory, moveHistory]);

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

    setBoardHistory((prev) => [...prev, cloneBoard(board)]);
    setBoard(nextBoard);
    setMoveHistory((prev) => [
      ...prev,
      {
        from: squareName(from),
        to: squareName(to),
        piece: piece.role,
        player: piece.player,
        captured: capturedRoles[0],
        captures: capturedRoles,
      },
    ]);
    setSelectedSquare(null);
    setCalledSquare(null);

    if (capturedRoles.includes('king')) {
      setCallTimer(null);
      setWinner(piece.player);
      setGameState('finished');
      return;
    }

    setTurn(piece.player);
    setCallTimer(30);
  }, [board, calledSquare, turn]);

  const handleSquareClick = useCallback((square: Square): void => {
    if (gameState === 'finished') {
      return;
    }

    if (callTimer !== null) {
      if (canCallSquare(board, square, turn)) {
        setCalledSquare(square);
        setCallTimer(null);
        setSelectedSquare(null);
        setTurn(getNextPlayer(turn));
      }

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
  }, [board, callTimer, calledSquare, gameState, makeMove, selectedSquare, turn]);

  const statusMessage = winner
    ? `${getPlayerLabel(winner)} captured the king and wins`
    : calledSquare
      ? `${getPlayerLabel(turn)} must capture; call at ${squareName(calledSquare)}`
      : callTimer !== null
        ? `${getPlayerLabel(turn)} may call: ${callTimer}s`
        : `${getPlayerLabel(turn)} to move`;

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <h1>Leung Rek</h1>
        <div className={styles.modeStatus}>
          <span>{isOnline ? 'Private Room' : 'Pass & Play'}</span>
          {roomCode && <span>Room {roomCode}</span>}
          {playerName && <span>{playerName}</span>}
        </div>
        <div className={styles.status}>{statusMessage}</div>
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
