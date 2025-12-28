// Game-related TypeScript types

export type GameScreen = "start" | "waiting" | "game" | "end" | "tournamentWaiting" | "tournamentMatchReady" | "quadWaiting";

export type GameMode = "solo" | "matchmaking" | "ai" | "tournament" | "quad" | "direct";

export type AIDifficulty = "easy" | "medium" | "hard" | "impossible";

export type PlayerRole = "player1" | "player2" | "both" | "team1Player1" | "team1Player2" | "team2Player1" | "team2Player2";

export type TeamRole = "team1" | "team2";

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

export interface QuadGameState {
  team1Player1: {
    x: number;
    y: number;
  };
  team1Player2: {
    x: number;
    y: number;
  };
  team2Player1: {
    x: number;
    y: number;
  };
  team2Player2: {
    x: number;
    y: number;
  };
  ball: {
    x: number;
    y: number;
  };
  team1Score: number;
  team2Score: number;
  countdown?: number;
  winner?: string;
  gameActive?: boolean;
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
  // Quad-specific fields
  team?: TeamRole;
  teammates?: Array<{
    username: string;
    id: number;
  }>;
  opponents?: Array<{
    username: string;
    id: number;
  }>;
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

export interface QuadWaitingInfo {
  queuePosition: number;
  totalWaiting: number;
}

export interface QuadWinScreenData {
  won: boolean;
  team: TeamRole;
  teammates: Array<{
    username: string;
    id: number;
  }>;
  opponents: Array<{
    username: string;
    id: number;
  }>;
  finalScore: {
    team1: number;
    team2: number;
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
    losses: number;
  };
}
