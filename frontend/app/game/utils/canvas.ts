// Canvas rendering utilities

import type { GameState, QuadGameState, PlayerInfo } from '../types';

/**
 * Render the game state on the canvas
 */
export const renderGame = (
  canvas: HTMLCanvasElement | null,
  state: GameState,
  playerInfo?: PlayerInfo | null
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

  // Helper function to draw rounded rectangle
  const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Player 1 paddle - Neon blue outline with transparent center
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#2f8cff";
  ctx.strokeStyle = "#2f8cff";
  ctx.lineWidth = 3;
  drawRoundedRect(state.player1.x, state.player1.y, 10, 100, 3);
  ctx.stroke();
  // Semi-transparent fill to show background
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(47, 140, 255, 0.15)";
  drawRoundedRect(state.player1.x, state.player1.y, 10, 100, 3);
  ctx.fill();

  // Player 2 paddle - Neon green outline with transparent center
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#34ce57";
  ctx.strokeStyle = "#34ce57";
  ctx.lineWidth = 3;
  drawRoundedRect(state.player2.x, state.player2.y, 10, 100, 3);
  ctx.stroke();
  // Semi-transparent fill to show background
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(52, 206, 87, 0.15)";
  drawRoundedRect(state.player2.x, state.player2.y, 10, 100, 3);
  ctx.fill();

  // Ball - Perfectly round neon yellow
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ffc107";
  ctx.fillStyle = "#ffc107";
  ctx.beginPath();
  ctx.arc(state.ball.x + 6, state.ball.y + 6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Countdown - Neon red hollow styling with "GO" text
  if (state.countdown !== undefined && state.countdown >= 0 && state.countdown <= 3) {
    ctx.save();
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Neon red glow effect
    ctx.shadowColor = "#ff0040";
    ctx.shadowBlur = 40;
    
    // Determine text to display
    const countdownText = state.countdown === 0 ? "GO!" : state.countdown.toString();
    
    // Draw stroke for bright neon outline
    ctx.strokeStyle = "#ff0040";
    ctx.lineWidth = 4;
    ctx.strokeText(countdownText, canvas.width / 2, canvas.height / 2);
    
    // Draw semi-transparent fill (hollow effect like paddles)
    ctx.fillStyle = "rgba(255, 0, 64, 0.15)";
    ctx.fillText(countdownText, canvas.width / 2, canvas.height / 2);
    
    ctx.restore();
  }
};

/**
 * Render the quad game state on the canvas (4-player, 2v2)
 */
export const renderQuadGame = (
  canvas: HTMLCanvasElement | null,
  state: QuadGameState,
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

  // Helper function to draw rounded rectangle
  const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Team 1 paddles (left side, neon blue outline)
  // Front paddle
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#2f8cff";
  ctx.strokeStyle = "#2f8cff";
  ctx.lineWidth = 3;
  drawRoundedRect(state.team1Player1.x, state.team1Player1.y, 10, 100, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(47, 140, 255, 0.15)";
  drawRoundedRect(state.team1Player1.x, state.team1Player1.y, 10, 100, 3);
  ctx.fill();
  // Back paddle
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#2f8cff";
  ctx.strokeStyle = "#2f8cff";
  ctx.lineWidth = 3;
  drawRoundedRect(state.team1Player2.x, state.team1Player2.y, 10, 100, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(47, 140, 255, 0.15)";
  drawRoundedRect(state.team1Player2.x, state.team1Player2.y, 10, 100, 3);
  ctx.fill();

  // Team 2 paddles (right side, neon green outline)
  // Front paddle
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#34ce57";
  ctx.strokeStyle = "#34ce57";
  ctx.lineWidth = 3;
  drawRoundedRect(state.team2Player1.x, state.team2Player1.y, 10, 100, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(52, 206, 87, 0.15)";
  drawRoundedRect(state.team2Player1.x, state.team2Player1.y, 10, 100, 3);
  ctx.fill();
  // Back paddle
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#34ce57";
  ctx.strokeStyle = "#34ce57";
  ctx.lineWidth = 3;
  drawRoundedRect(state.team2Player2.x, state.team2Player2.y, 10, 100, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(52, 206, 87, 0.15)";
  drawRoundedRect(state.team2Player2.x, state.team2Player2.y, 10, 100, 3);
  ctx.fill();

  // Ball - Perfectly round neon yellow
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ffc107";
  ctx.fillStyle = "#ffc107";
  ctx.beginPath();
  ctx.arc(state.ball.x + 6, state.ball.y + 6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Countdown - Neon red hollow styling with "GO" text
  if (state.countdown !== undefined && state.countdown >= 0 && state.countdown <= 3) {
    ctx.save();
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Neon red glow effect
    ctx.shadowColor = "#ff0040";
    ctx.shadowBlur = 40;
    
    // Determine text to display
    const countdownText = state.countdown === 0 ? "GO!" : state.countdown.toString();
    
    // Draw stroke for bright neon outline
    ctx.strokeStyle = "#ff0040";
    ctx.lineWidth = 4;
    ctx.strokeText(countdownText, canvas.width / 2, canvas.height / 2);
    
    // Draw semi-transparent fill (hollow effect like paddles)
    ctx.fillStyle = "rgba(255, 0, 64, 0.15)";
    ctx.fillText(countdownText, canvas.width / 2, canvas.height / 2);
    
    ctx.restore();
  }
};

