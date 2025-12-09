// Custom hook for keyboard controls

import { useEffect } from 'react';
import type { PlayerInfo } from '../types';

interface UseGameKeyboardProps {
  enabled: boolean;
  playerInfo: PlayerInfo | null;
  sendUpdate: (player1DY: number, player2DY: number) => void;
}

export const useGameKeyboard = ({ enabled, playerInfo, sendUpdate }: UseGameKeyboardProps): void => {
  useEffect(() => {
    if (!enabled) return;
    
    console.log("Setting up controls for player:", playerInfo?.role);

    const keysPressed = new Set<string>();
    
    const handleUpdate = () => {
      let player1DY = 0;
      let player2DY = 0;
      
      let myMovement = 0;
      if (keysPressed.has("w") || keysPressed.has("W") || keysPressed.has("ArrowUp")) {
        myMovement -= 5;
      }
      if (keysPressed.has("s") || keysPressed.has("S") || keysPressed.has("ArrowDown")) {
        myMovement += 5;
      }
      
      if (playerInfo?.role === 'player1') {
        player1DY = myMovement;
      } else if (playerInfo?.role === 'player2') {
        player2DY = myMovement;
      } else if (playerInfo?.role === 'both') {
        if (keysPressed.has("w") || keysPressed.has("W")) player1DY -= 5;
        if (keysPressed.has("s") || keysPressed.has("S")) player1DY += 5;
        if (keysPressed.has("ArrowUp")) player2DY -= 5;
        if (keysPressed.has("ArrowDown")) player2DY += 5;
      }
      
      if (player1DY !== 0 || player2DY !== 0) {
        console.log(`🎮 Frontend sending: role=${playerInfo?.role}, p1DY=${player1DY}, p2DY=${player2DY}, keys=[${Array.from(keysPressed)}]`);
      }
      
      sendUpdate(player1DY, player2DY);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.add(e.key);
      handleUpdate();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.delete(e.key);
      handleUpdate();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled, playerInfo, sendUpdate]);
};

