// Quadra Pong Game State - 4 player team-based pong
// 2v2 mode with stacked paddles on each side

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const PADDLE_STACK_OFFSET = 20; // 20px between stacked paddles for better visibility
const PADDLE_MARGIN_X = 10; // Horizontal margin from left/right edges
const PADDLE_MARGIN_Y = 8; // Vertical margin to prevent touching top/bottom borders
const BALL_SIZE = 10;

class QuadPongState {
  constructor() {
    this.gameState = {
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: 0, dy: 0 },
      // Team 1 (Left side) - two paddles horizontally stacked (front and back)
      team1Player1: { x: PADDLE_MARGIN_X, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2, dy: 0 }, // Front paddle
      team1Player2: { x: PADDLE_MARGIN_X + PADDLE_WIDTH + PADDLE_STACK_OFFSET, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2, dy: 0 }, // Back paddle
      // Team 2 (Right side) - two paddles horizontally stacked (front and back)
      team2Player1: { x: CANVAS_WIDTH - PADDLE_MARGIN_X - PADDLE_WIDTH, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2, dy: 0 }, // Front paddle
      team2Player2: { x: CANVAS_WIDTH - PADDLE_MARGIN_X - PADDLE_WIDTH - PADDLE_WIDTH - PADDLE_STACK_OFFSET, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2, dy: 0 }, // Back paddle
      // Team scores
      team1Score: 0,
      team2Score: 0,
      winner: null,
      countdown: 0,
      gameActive: false,
      totalVolleys: 0,
    };
    
    this.baseSpeed = 3;
    this.lastSpeedIncrease = Date.now();
    this.countdownInterval = null;
  }

  // Get current game state
  getState() {
    return this.gameState;
  }

  // Update player movement - each player controls their own paddle
  updatePlayerMovement(playerUpdates) {
    // Block movement during countdown
    if (this.gameState.countdown > 0) {
      return;
    }

    // playerUpdates format: { team1Player1DY, team1Player2DY, team2Player1DY, team2Player2DY }
    if (playerUpdates.team1Player1DY !== undefined) {
      this.gameState.team1Player1.dy = playerUpdates.team1Player1DY;
    }
    if (playerUpdates.team1Player2DY !== undefined) {
      this.gameState.team1Player2.dy = playerUpdates.team1Player2DY;
    }
    if (playerUpdates.team2Player1DY !== undefined) {
      this.gameState.team2Player1.dy = playerUpdates.team2Player1DY;
    }
    if (playerUpdates.team2Player2DY !== undefined) {
      this.gameState.team2Player2.dy = playerUpdates.team2Player2DY;
    }
  }

  // Reset ball for a new round
  resetBall(losingTeam = null) {
    console.log(`[QUAD] Resetting ball, losing team: ${losingTeam}`);
    
    // Clear any existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    const startY = Math.random() < 0.5 ? CANVAS_HEIGHT / 4 : (3 * CANVAS_HEIGHT) / 4;
    let dx = losingTeam === "team1" ? -this.baseSpeed : this.baseSpeed;
    if (!losingTeam) dx = Math.random() < 0.5 ? -this.baseSpeed : this.baseSpeed;
    let dy = Math.random() < 0.5 ? -this.baseSpeed : this.baseSpeed;

    this.gameState.ball = { x: CANVAS_WIDTH / 2, y: startY, dx: 0, dy: 0 };
    this.gameState.countdown = 3; // Start at 3 for 3-2-1-GO
    this.gameState.gameActive = false;

    // Reset all paddles to center positions (horizontally stacked)
    const centerY = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    this.gameState.team1Player1.y = centerY;
    this.gameState.team1Player2.y = centerY;
    this.gameState.team2Player1.y = centerY;
    this.gameState.team2Player2.y = centerY;
    
    // Reset velocities
    this.gameState.team1Player1.dy = 0;
    this.gameState.team1Player2.dy = 0;
    this.gameState.team2Player1.dy = 0;
    this.gameState.team2Player2.dy = 0;

    this.countdownInterval = setInterval(() => {
      this.gameState.countdown -= 1;
      console.log(`[QUAD] Countdown: ${this.gameState.countdown}`);

      if (this.gameState.countdown < 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.gameState.ball.dx = dx;
        this.gameState.ball.dy = dy;
        this.gameState.gameActive = true;
        // Clear countdown display after GO
        setTimeout(() => {
          this.gameState.countdown = -1;
        }, 500);
        console.log(`[QUAD] Game started! Ball speed: dx=${dx}, dy=${dy}, baseSpeed=${this.baseSpeed}`);
      }
    }, 1000);
  }

  // Update game physics
  update() {
    if (!this.gameState.gameActive) return;

    const state = this.gameState;

    // Move paddles (with boundary checks)
    const paddles = [
      state.team1Player1,
      state.team1Player2,
      state.team2Player1,
      state.team2Player2
    ];

    paddles.forEach(paddle => {
      paddle.y += paddle.dy;
      paddle.y = Math.max(PADDLE_MARGIN_Y, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT - PADDLE_MARGIN_Y, paddle.y));
    });

    // Move ball
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    // Ball collision with top/bottom walls (no margin - ball bounces off actual walls)
    if (state.ball.y <= 0 || state.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      state.ball.dy = -state.ball.dy;
      // Clamp ball within boundaries
      state.ball.y = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, state.ball.y));
    }

    // Ball collision with Team 1 paddles (left side)
    // Check both front (player1) and back (player2) paddles
    let team1Hit = false;
    
    // Check front paddle (team1Player1)
    if (
      state.ball.x <= state.team1Player1.x + PADDLE_WIDTH &&
      state.ball.x >= state.team1Player1.x &&
      state.ball.dx < 0 &&
      state.ball.y + BALL_SIZE >= state.team1Player1.y && 
      state.ball.y <= state.team1Player1.y + PADDLE_HEIGHT
    ) {
      team1Hit = true;
    }
    
    // Check back paddle (team1Player2) - only if ball passed front paddle
    if (!team1Hit &&
      state.ball.x <= state.team1Player2.x + PADDLE_WIDTH &&
      state.ball.x >= state.team1Player2.x &&
      state.ball.dx < 0 &&
      state.ball.y + BALL_SIZE >= state.team1Player2.y && 
      state.ball.y <= state.team1Player2.y + PADDLE_HEIGHT
    ) {
      team1Hit = true;
    }

    if (team1Hit) {
      state.ball.dx = -state.ball.dx;
      state.totalVolleys++;
      
      // Speed increase every 5 volleys
      if (state.totalVolleys % 5 === 0) {
        this.baseSpeed += 0.2;
        state.ball.dx = state.ball.dx > 0 ? this.baseSpeed : -this.baseSpeed;
        state.ball.dy = state.ball.dy > 0 ? this.baseSpeed : -this.baseSpeed;
      }
    }

    // Ball collision with Team 2 paddles (right side)
    // Check both front (player1) and back (player2) paddles
    let team2Hit = false;
    
    // Check front paddle (team2Player1)
    if (
      state.ball.x + BALL_SIZE >= state.team2Player1.x &&
      state.ball.x + BALL_SIZE <= state.team2Player1.x + PADDLE_WIDTH &&
      state.ball.dx > 0 &&
      state.ball.y + BALL_SIZE >= state.team2Player1.y && 
      state.ball.y <= state.team2Player1.y + PADDLE_HEIGHT
    ) {
      team2Hit = true;
    }
    
    // Check back paddle (team2Player2) - only if ball passed front paddle
    if (!team2Hit &&
      state.ball.x + BALL_SIZE >= state.team2Player2.x &&
      state.ball.x + BALL_SIZE <= state.team2Player2.x + PADDLE_WIDTH &&
      state.ball.dx > 0 &&
      state.ball.y + BALL_SIZE >= state.team2Player2.y && 
      state.ball.y <= state.team2Player2.y + PADDLE_HEIGHT
    ) {
      team2Hit = true;
    }

    if (team2Hit) {
      state.ball.dx = -state.ball.dx;
      state.totalVolleys++;
      
      // Speed increase every 5 volleys
      if (state.totalVolleys % 5 === 0) {
        this.baseSpeed += 0.2;
        state.ball.dx = state.ball.dx > 0 ? this.baseSpeed : -this.baseSpeed;
        state.ball.dy = state.ball.dy > 0 ? this.baseSpeed : -this.baseSpeed;
      }
    }

    // Scoring - Team 2 scores (ball went past Team 1)
    if (state.ball.x < 0) {
      state.team2Score++;
      console.log(`[QUAD] Team 2 scored! Score: ${state.team1Score} - ${state.team2Score}`);
      
      // Stop the ball immediately to prevent multiple scoring
      state.gameActive = false;
      state.ball.dx = 0;
      state.ball.dy = 0;
      
      if (state.team2Score >= 5) {
        state.winner = "team2";
        console.log(`[QUAD] Team 2 wins!`);
      } else {
        // Add 500ms delay before starting countdown
        setTimeout(() => {
          this.resetBall("team1");
        }, 500);
      }
    }

    // Scoring - Team 1 scores (ball went past Team 2)
    if (state.ball.x > CANVAS_WIDTH) {
      state.team1Score++;
      console.log(`[QUAD] Team 1 scored! Score: ${state.team1Score} - ${state.team2Score}`);
      
      // Stop the ball immediately to prevent multiple scoring
      state.gameActive = false;
      state.ball.dx = 0;
      state.ball.dy = 0;
      
      if (state.team1Score >= 5) {
        state.winner = "team1";
        console.log(`[QUAD] Team 1 wins!`);
      } else {
        // Add 500ms delay before starting countdown
        setTimeout(() => {
          this.resetBall("team2");
        }, 500);
      }
    }
  }

  // Start the game
  start() {
    console.log("[QUAD] Starting quadra pong game...");
    this.resetBall();
  }

  // Cleanup
  cleanup() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}

module.exports = QuadPongState;
