// Rank calculation utilities

import type { RankInfo } from '../types';

/**
 * Calculate rank info based on rank points (Valorant-style ranking)
 */
export const getRankInfo = (rankPoints: number): RankInfo => {
  const ranks: Omit<RankInfo, 'points' | 'progressToNext' | 'pointsNeededForNext'>[] = [
    { tier: "Bronze", level: 1, minPoints: 0, maxPoints: 19, color: "#CD7F32" },
    { tier: "Bronze", level: 2, minPoints: 20, maxPoints: 39, color: "#CD7F32" },
    { tier: "Bronze", level: 3, minPoints: 40, maxPoints: 59, color: "#CD7F32" },
    { tier: "Silver", level: 1, minPoints: 60, maxPoints: 79, color: "#C0C0C0" },
    { tier: "Silver", level: 2, minPoints: 80, maxPoints: 99, color: "#C0C0C0" },
    { tier: "Silver", level: 3, minPoints: 100, maxPoints: 119, color: "#C0C0C0" },
    { tier: "Gold", level: 1, minPoints: 120, maxPoints: 139, color: "#FFD700" },
    { tier: "Gold", level: 2, minPoints: 140, maxPoints: 159, color: "#FFD700" },
    { tier: "Gold", level: 3, minPoints: 160, maxPoints: 179, color: "#FFD700" },
    { tier: "Platinum", level: 1, minPoints: 180, maxPoints: 199, color: "#E5E4E2" },
    { tier: "Platinum", level: 2, minPoints: 200, maxPoints: 219, color: "#E5E4E2" },
    { tier: "Platinum", level: 3, minPoints: 220, maxPoints: 239, color: "#E5E4E2" },
    { tier: "Diamond", level: 1, minPoints: 240, maxPoints: 259, color: "#B9F2FF" },
    { tier: "Diamond", level: 2, minPoints: 260, maxPoints: 279, color: "#B9F2FF" },
    { tier: "Diamond", level: 3, minPoints: 280, maxPoints: 299, color: "#B9F2FF" },
    { tier: "Immortal", level: 1, minPoints: 300, maxPoints: 319, color: "#FF6B6B" },
    { tier: "Immortal", level: 2, minPoints: 320, maxPoints: 339, color: "#FF6B6B" },
    { tier: "Immortal", level: 3, minPoints: 340, maxPoints: 359, color: "#FF6B6B" },
    { tier: "Radiant", level: 1, minPoints: 360, maxPoints: 999, color: "#FFFF00" }
  ];

  const points = Math.max(0, Math.min(999, rankPoints || 0));
  
  for (const rank of ranks) {
    if (points >= rank.minPoints && points <= rank.maxPoints) {
      return {
        ...rank,
        points: points,
        progressToNext: points - rank.minPoints,
        pointsNeededForNext: rank.maxPoints - points
      };
    }
  }
  
  return {
    ...ranks[0],
    points: 0,
    progressToNext: 0,
    pointsNeededForNext: 19
  }; // Fallback to Bronze 1
};

