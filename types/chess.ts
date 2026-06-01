export type Player = 'red' | 'blue';
export type RekPieceRole = 'king' | 'commoner';

export interface RekPiece {
  player: Player;
  role: RekPieceRole;
}

export type RekBoard = Array<Array<RekPiece | null>>;

export interface MoveHistoryItem {
  from: string;
  to: string;
  piece: RekPieceRole;
  player: Player;
  captured?: RekPieceRole;
  captures?: RekPieceRole[];
}

export type GameState = 'active' | 'finished';
