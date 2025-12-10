// Canvas rendering utilities

import type { GameState, PlayerInfo } from '../types';

/**
 * Render the game state on the canvas
 */
export const renderGame = (
  canvas: HTMLCanvasElement | null,
  state: GameState,
  playerInfo?: PlayerInfo
): void => {
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background & border
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0b111f");
  gradient.addColorStop(1, "#0a0f1c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#2f8cff";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // Center line
  ctx.strokeStyle = "rgba(122, 184, 255, 0.6)";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Paddles + ball
  ctx.save();
  ctx.shadowBlur = 12;

  // Player 1 paddle
  ctx.fillStyle = "#2f8cff";
  ctx.shadowColor = "#2f8cff";
  ctx.fillRect(state.player1.x, state.player1.y, 10, 100);

  // Player 2 paddle
  ctx.fillStyle = "#34ce57";
  ctx.shadowColor = "#34ce57";
  ctx.fillRect(state.player2.x, state.player2.y, 10, 100);

  // Ball
  ctx.fillStyle = "#ffc107";
  ctx.shadowColor = "#ffc107";
  ctx.fillRect(state.ball.x, state.ball.y, 12, 12);
  ctx.restore();

  // Player role indicators
  if (playerInfo?.role) {
    ctx.fillStyle = "yellow";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    
    if (playerInfo.role === 'player1' || playerInfo.role === 'both') {
      ctx.fillText("YOU", 25, 25);
    }
    if (playerInfo.role === 'player2' || playerInfo.role === 'both') {
      ctx.textAlign = "right";
      ctx.fillText(playerInfo.role === 'both' ? "YOU" : "YOU", canvas.width - 25, 25);
    }
  }

  // Countdown
  if (state.countdown && state.countdown > 0) {
    ctx.fillStyle = "yellow";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(state.countdown.toString(), canvas.width / 2, canvas.height / 2);
  }
};

