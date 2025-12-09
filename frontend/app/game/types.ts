// Game-related TypeScript types

export type GameScreen = "start" | "waiting" | "game" | "end" | "tournamentWaiting" | "tournamentMatchReady";

export type GameMode = "solo" | "matchmaking" | "ai" | "tournament";

export type AIDifficulty = "easy" | "medium" | "hard" | "impossible";

export type PlayerRole = "player1" | "player2" | "both";

export interface GameState {
  player1: {
    x: number;
    y: number;
    score: number;
  };
  player2: {
    x: number;
    y: number;
    score: number;
  };
  ball: {
    x: number;
    y: number;
  };
  countdown?: number;
  winner?: string;
}

export interface PlayerInfo {
  role?: PlayerRole;
  roomId?: string;
  gameType?: string;
  opponent?: {
    username: string;
    id: number;
  };
  user?: {
    id: number;
    username: string;
    name?: string;
    email?: string;
  };
  username?: string;
  tournamentId?: string;
  round?: string;
}

export interface PlayerStats {
  player_level: number;
  experience_points: number;
  rank_points: number;
  rank_tier: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  current_streak: number;
}

export interface RankInfo {
  tier: string;
  level: number;
  minPoints: number;
  maxPoints: number;
  color: string;
  points: number;
  progressToNext: number;
  pointsNeededForNext: number;
}

export interface WinScreenData {
  playerData: {
    won?: boolean;
    opponent?: string;
    ratingChange?: number;
    xpGain?: number;
    result?: string;
    rewards?: {
      experience?: number;
      rankPoints?: number;
      rankPointsChange?: number;
    };
    progression?: {
      before: {
        experience: number;
        rank: string;
        rankPoints: number;
        gamesPlayed: number;
        gamesWon: number;
        winRate: number;
      };
      after: {
        experience: number;
        rank: string;
        rankPoints: number;
        gamesPlayed: number;
        gamesWon: number;
        winRate: number;
      };
    };
    stats?: {
      oldRating: number;
      newRating: number;
      oldXp: number;
      newXp: number;
      oldLevel: number;
      newLevel: number;
      totalMatches: number;
      wins: number;
    };
  };
  matchData: {
    duration?: string;
    winnerName?: string;
    player1Score?: number;
    player2Score?: number;
    totalVolleys?: number;
    round?: string;
    tournamentComplete?: boolean;
    isTournamentWinner?: boolean;
    waitingForNextRound?: boolean;
  };
  isTournament?: boolean;
}

export interface TournamentQueue {
  queuePosition: number;
  queueSize: number;
  playerList: Array<{
    username: string;
    rank?: string;
  }>;
}

export interface MatchReadyInfo {
  opponent: {
    username: string;
  };
  playerRole: PlayerRole;
  round: string;
  matchId: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

