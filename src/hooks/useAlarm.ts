import { useCallback, useRef } from 'react';

export type AlarmType = 'focus' | 'break';

export function useAlarm() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.error('Failed to resume AudioContext:', e));
    }
    return audioContextRef.current;
  }, []);

  const playFocusAlarm = useCallback(() => {
    const audioCtx = getAudioContext();
    const now = audioCtx.currentTime;

    // Focus alarm: Gentle ascending chimes (C -> E -> G)
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      // Smooth envelope
      gainNode.gain.setValueAtTime(0, now + index * 0.2);
      gainNode.gain.linearRampToValueAtTime(0.15, now + index * 0.2 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.2 + 0.4);

      oscillator.start(now + index * 0.2);
      oscillator.stop(now + index * 0.2 + 0.4);
    });
  }, [getAudioContext]);

  const playBreakAlarm = useCallback(() => {
    const audioCtx = getAudioContext();
    const now = audioCtx.currentTime;

    // Break alarm: Soft descending notes (G -> E -> C)
    const frequencies = [783.99, 659.25, 523.25]; // G5, E5, C5
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'triangle'; // Softer than sine
      oscillator.frequency.value = freq;

      // Gentle envelope
      gainNode.gain.setValueAtTime(0, now + index * 0.25);
      gainNode.gain.linearRampToValueAtTime(0.12, now + index * 0.25 + 0.06);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.25 + 0.5);

      oscillator.start(now + index * 0.25);
      oscillator.stop(now + index * 0.25 + 0.5);
    });
  }, [getAudioContext]);

  const playAlarm = useCallback((type: AlarmType) => {
    if (type === 'focus') {
      playFocusAlarm();
    } else {
      playBreakAlarm();
    }
  }, [playFocusAlarm, playBreakAlarm]);

  const initAudioContext = useCallback(() => {
    // Just initialize AudioContext without playing sound
    getAudioContext();
  }, [getAudioContext]);

  return { playAlarm, initAudioContext };
}

