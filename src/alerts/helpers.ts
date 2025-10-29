// alerts/helpers.ts
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export function showEndNotification(opts?: { title?: string; body?: string }) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(opts?.title ?? '🍅 Pomopomo — Time's up!', {
    body: opts?.body ?? 'Focus block finished. Ready for the next segment?',
    tag: 'pomopomo-timer',
    renotify: true,
    silent: false,
    icon: '/tomato.svg',
  });
}

export async function unlockAudioOnce(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
  if (!Ctx) return false;
  const ctx = new Ctx();
  if (ctx.state === 'suspended') await ctx.resume();
  // quick bip to unlock iOS
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = 880;
  g.gain.value = 0.0005;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.05);
  return true;
}

export async function playEndChime({ volume = 0.7, repeats = 1, intervalMs = 2000 } = {}) {
  if (typeof window === 'undefined') return;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
  if (!Ctx) return;
  const ctx = new Ctx();

  const burst = () => {
    const master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 30;
    comp.ratio.value = 12;
    comp.attack.value = 0.002;
    comp.release.value = 0.15;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(2600, now);
    osc.frequency.exponentialRampToValueAtTime(4600, now + 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.8, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    osc.connect(gain);
    gain.connect(comp);
    comp.connect(limiter);
    limiter.connect(master);
    master.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
  };

  for (let i = 0; i < Math.max(1, repeats); i++) {
    burst();
    if (i < repeats - 1) await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export function vibratePattern() {
  if (typeof window === 'undefined') return;
  if (navigator?.vibrate) navigator.vibrate([60, 20, 60]);
}

