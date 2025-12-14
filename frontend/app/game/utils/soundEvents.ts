// Detect game events from state changes for sound effects

import type { GameState, QuadGameState } from '../types';

interface GameSoundEvents {
  paddleHit: boolean;
  wallBounce: boolean;
  scored: boolean;
  countdown: boolean;
  go: boolean;
}

export const detectSoundEvents = (
  prevState: GameState | QuadGameState | null,
  currentState: GameState | QuadGameState,
  isQuadMode: boolean
): GameSoundEvents => {
  const events: GameSoundEvents = {
    paddleHit: false,
    wallBounce: false,
    scored: false,
    countdown: false,
    go: false
  };

  if (!prevState) return events;

  const prevBall = prevState.ball;
  const currBall = currentState.ball;

  // Detect paddle hit by checking if ball just crossed a paddle threshold
  // Left paddle: ball crosses x=30 from right to left
  const crossedLeftPaddle = prevBall.x > 30 && currBall.x <= 30;
  // Right paddle: ball crosses x=570 from left to right
  const crossedRightPaddle = prevBall.x < 570 && currBall.x >= 570;
  
  if (crossedLeftPaddle || crossedRightPaddle) {
    events.paddleHit = true;
  }

  // Detect wall bounce by checking if ball just crossed wall boundaries
  // Top wall: ball crosses y=5 from below
  const crossedTopWall = prevBall.y > 5 && currBall.y <= 5;
  // Bottom wall: ball crosses y=385 from above (400 - 10 ball size - 5 buffer)
  const crossedBottomWall = prevBall.y < 385 && currBall.y >= 385;
  
  if (crossedTopWall || crossedBottomWall) {
    events.wallBounce = true;
  }

  // Detect scoring
  if (isQuadMode) {
    const prevQuad = prevState as QuadGameState;
    const currQuad = currentState as QuadGameState;
    if (prevQuad.team1Score !== currQuad.team1Score || prevQuad.team2Score !== currQuad.team2Score) {
      events.scored = true;
    }
    // Countdown: trigger on 3, 2, 1 (regular beeps)
    if (currQuad.countdown !== undefined && prevQuad.countdown !== undefined && 
        currQuad.countdown !== prevQuad.countdown && currQuad.countdown >= 1 && currQuad.countdown <= 3) {
      events.countdown = true;
    }
    // GO: trigger on 0 (special intense beep)
    if (currQuad.countdown !== undefined && prevQuad.countdown !== undefined && 
        currQuad.countdown === 0 && prevQuad.countdown === 1) {
      events.go = true;
    }
  } else {
    const prevRegular = prevState as GameState;
    const currRegular = currentState as GameState;
    if (prevRegular.player1.score !== currRegular.player1.score || prevRegular.player2.score !== currRegular.player2.score) {
      events.scored = true;
    }
    // Countdown: trigger on 3, 2, 1 (regular beeps)
    if (currRegular.countdown !== undefined && prevRegular.countdown !== undefined && 
        currRegular.countdown !== prevRegular.countdown && currRegular.countdown >= 1 && currRegular.countdown <= 3) {
      events.countdown = true;
    }
    // GO: trigger on 0 (special intense beep)
    if (currRegular.countdown !== undefined && prevRegular.countdown !== undefined && 
        currRegular.countdown === 0 && prevRegular.countdown === 1) {
      events.go = true;
    }
  }

  return events;
};
