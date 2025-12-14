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

  // Detect paddle hit - ball crossed paddle threshold and changed direction
  const crossedLeftPaddle = prevBall.x > 45 && currBall.x <= 45;
  const crossedRightPaddle = prevBall.x < 555 && currBall.x >= 555;
  
  if (crossedLeftPaddle || crossedRightPaddle) {
    events.paddleHit = true;
  }

  // Detect wall bounce - ball bounced off top or bottom
  const bouncedOffTop = prevBall.y > 5 && currBall.y <= 5;
  const bouncedOffBottom = prevBall.y < 390 && currBall.y >= 390;
  
  if (bouncedOffTop || bouncedOffBottom) {
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
