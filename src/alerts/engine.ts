// alerts/engine.ts
import { playEndChime, showEndNotification, vibratePattern } from './helpers';
import { loadPrefs } from './prefs';

export async function handleSegmentEnd() {
  const p = loadPrefs();

  if (p.notifications) showEndNotification();

  if (p.chime) {
    await playEndChime({ volume: p.boosted ? 0.85 : 0.6, repeats: Math.min(3, p.repeats || 1) });
  }

  if (p.vibrate) vibratePattern();

  // Optional: flash tab title if hidden
  if (typeof document !== 'undefined' && document.hidden) {
    const original = document.title;
    let on = true;
    const id = setInterval(() => {
      document.title = on ? '⏰ Time's up! — Pomopomo' : original;
      on = !on;
    }, 900);
    const stop = () => {
      clearInterval(id);
      document.title = original;
      document.removeEventListener('visibilitychange', stop);
    };
    document.addEventListener('visibilitychange', stop);
    // Auto-stop after 10 seconds if tab stays hidden
    setTimeout(stop, 10000);
  }
}

