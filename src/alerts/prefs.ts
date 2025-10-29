// alerts/prefs.ts
export type AlertPrefs = {
  chime: boolean;
  boosted: boolean;
  repeats: 0 | 1 | 2 | 3;
  notifications: boolean;
  vibrate: boolean;
  unlockedAudio: boolean; // set after Test Sound
};

const KEY = 'pomopomo.alerts:v1';

export function loadPrefs(): AlertPrefs {
  if (typeof window === 'undefined') {
    return { chime: false, boosted: false, repeats: 1, notifications: false, vibrate: false, unlockedAudio: false };
  }
  try {
    return {
      chime: false,
      boosted: false,
      repeats: 1,
      notifications: false,
      vibrate: false,
      unlockedAudio: false,
      ...JSON.parse(localStorage.getItem(KEY) || '{}'),
    };
  } catch {
    return { chime: false, boosted: false, repeats: 1, notifications: false, vibrate: false, unlockedAudio: false };
  }
}

export function savePrefs(p: AlertPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

