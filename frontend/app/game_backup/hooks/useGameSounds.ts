// Custom hook for game sound effects

import { useEffect, useRef } from 'react';

interface UseGameSoundsProps {
  enabled: boolean;
  volume?: number;
}

export const useGameSounds = ({ enabled, volume = 0.5 }: UseGameSoundsProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (enabled && typeof window !== 'undefined') {
      // Initialize Audio Context for Web Audio API
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      // Cleanup
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, [enabled]);

  // Synthesized beep sound for paddle hit
  const playPaddleHit = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 440; // A4 note
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  // Synthesized sound for wall bounce - thicker, lower volume
  const playWallBounce = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Create two oscillators for a thicker sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.frequency.value = 150; // Lower frequency for thicker sound
    osc2.frequency.value = 180; // Slightly detuned
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    
    gainNode.gain.setValueAtTime(volume * 0.25, ctx.currentTime); // Increased volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.1);
  };

  // Synthesized sound for scoring
  const playScore = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Play a quick ascending arpeggio
    const frequencies = [523, 659, 784]; // C5, E5, G5
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'triangle';
      
      const startTime = ctx.currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(volume * 0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  };

  // Synthesized sound for game win
  const playWin = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Play a victory fanfare (ascending arpeggio)
    const melody = [
      { freq: 523, time: 0 },     // C5
      { freq: 659, time: 0.12 },  // E5
      { freq: 784, time: 0.24 },  // G5
      { freq: 1047, time: 0.36 }  // C6
    ];
    
    melody.forEach(({ freq, time }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'triangle';
      
      const startTime = ctx.currentTime + time;
      gainNode.gain.setValueAtTime(volume * 0.35, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });
  };

  // Synthesized sound for game loss
  const playLoss = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Play a descending tone (sad trombone effect)
    const melody = [
      { freq: 440, time: 0 },     // A4
      { freq: 392, time: 0.15 },  // G4
      { freq: 349, time: 0.3 },   // F4
      { freq: 294, time: 0.45 }   // D4
    ];
    
    melody.forEach(({ freq, time }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sawtooth';
      
      const startTime = ctx.currentTime + time;
      gainNode.gain.setValueAtTime(volume * 0.25, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.35);
    });
  };

  // Ambient background sound (subtle white noise)
  const startBackgroundAmbience = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Create a subtle looping ambient sound using oscillators
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 110; // A2
    osc2.frequency.value = 165; // E3
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.value = volume * 0.05; // Very quiet ambient
    
    osc1.start();
    osc2.start();
    
    // Store reference for cleanup
    return () => {
      osc1.stop();
      osc2.stop();
    };
  };

  // Countdown beep
  const playCountdown = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  };

  // Intense GO horn - thick, powerful horn-like sound
  const playGo = () => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Create multiple oscillators for a thick horn sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const osc4 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc3.connect(gainNode);
    osc4.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Lower frequencies for thick horn sound
    osc1.frequency.value = 150;  // Deep bass
    osc2.frequency.value = 200;  // Slightly detuned for thickness
    osc3.frequency.value = 300;  // Harmonic
    osc4.frequency.value = 450;  // Upper harmonic
    osc1.type = 'sawtooth';  // Rich harmonic content
    osc2.type = 'sawtooth';
    osc3.type = 'triangle';
    osc4.type = 'sine';
    
    // Louder and longer for horn effect
    gainNode.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc3.start(ctx.currentTime);
    osc4.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
    osc3.stop(ctx.currentTime + 0.4);
    osc4.stop(ctx.currentTime + 0.4);
  };

  return {
    playPaddleHit,
    playWallBounce,
    playScore,
    playWin,
    playLoss,
    playCountdown,
    playGo,
    startBackgroundAmbience
  };
};
