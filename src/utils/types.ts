import { Game } from '../domain/Game.js';
import { Player } from '../domain/Player.js';

export interface GenericData {
  cookie: string;
}

export interface CreateGameData extends GenericData {
  player: {
    username: string;
  };
}

export interface JoinGameData extends GenericData {
  player: {
    username: string;
  };
  game: {
    id: string;
  };
}

export interface CookieProps {
  player: Player;
  game: Game;
}

export interface PlayerType {
  uuid: string;
  username: string;
  readyToPlay: boolean;
}

export interface GameType {
  id: string;
  owner: PlayerType;
  players: PlayerType[];
  actualRound: number;
  playersChoices: PlayerChoice[];
}

export interface CookieData {
  player: PlayerType;
  game: GameType;
  iat: number;
}

export interface PlayerChoice {
  uuid: string;
  round: number;
  choice: string;
}

export interface PlayerChoiceSocket extends GenericData, PlayerChoice {}

export interface ConsultNextPageSocket extends PlayerChoiceSocket {
  actualRound: number;
}

export interface LikedMeme {
  author: string;
  likedBy: string;
  round: number;
  gifUrl: string;
}

export interface GameResult {
  round: number;
  author: {
    uuid: string;
    username: string;
  };
  gifUrl: string;
  totalPoints: number;
  likes: number;
}

export interface JoinGameRequest {
  id?: string | undefined;
  joiner: Player;
}

export const PHASE = {
  PENDING: 'pending',
  DRAFT: 'draft',
  VOTE: 'vote',
  RESULT: 'result',
  END: 'end',
} as const;

export type PhaseType = (typeof PHASE)[keyof typeof PHASE];
