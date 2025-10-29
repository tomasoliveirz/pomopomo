'use client';
import { useEffect, useState } from 'react';
import { loadPrefs, savePrefs, AlertPrefs } from '@/alerts/prefs';
import { ensureNotificationPermission, unlockAudioOnce, playEndChime } from '@/alerts/helpers';

export default function AlertsSettings({ onClose }: { onClose: () => void }) {
  const [p, setP] = useState<AlertPrefs>(loadPrefs());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    savePrefs(p);
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [p]);

  const toggle = (k: keyof AlertPrefs) => async () => {
    // Handle notifications - request permission and test
    if (k === 'notifications' && !p.notifications) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        alert('Notifications blocked. Please enable them in browser settings.');
        return;
      }
      // Test notification immediately
      setTimeout(() => {
        new Notification('🍅 Pomopomo Alerts Enabled!', {
          body: 'You\'ll get notified when segments end.',
          silent: true,
          icon: '/tomato.svg',
        });
      }, 300);
    }
    
    // Handle chime - auto-unlock audio
    if (k === 'chime' && !p.chime && !p.unlockedAudio) {
      const ok = await unlockAudioOnce();
      if (ok) {
        setP((prev) => ({ ...prev, chime: true, unlockedAudio: true }));
        // Test sound immediately
        setTimeout(() => playEndChime({ volume: 0.6, repeats: 1 }), 100);
        return;
      }
    }
    
    const next = { ...p, [k]: !p[k] as any };
    setP(next);
  };

  const testSound = async () => {
    const ok = await unlockAudioOnce();
    if (ok) setP((prev) => ({ ...prev, unlockedAudio: true }));
    await playEndChime({ volume: p.boosted ? 0.85 : 0.6, repeats: 1 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full rounded-2xl p-4 md:p-6 bg-card text-foreground shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">🔔 Alert Settings</h3>
          <button
            onClick={onClose}
            className="text-2xl w-8 h-8 flex items-center justify-center hover:bg-accent-subtle/20 rounded-lg"
          >
            ×
          </button>
        </div>

        {saved && (
          <div className="text-sm text-center py-2 bg-accent/10 text-accent rounded-lg">
            ✓ Saved
          </div>
        )}

        <Row
          label="🔔 End chime"
          desc="Short high-pitch pop when a segment ends."
          onClick={toggle('chime')}
          active={p.chime}
        />

        <Row
          label="📢 Boost loudness"
          desc="Slightly louder/denser chime (cuts through music)."
          disabled={!p.chime}
          onClick={toggle('boosted')}
          active={p.boosted}
        />

        <RowSelect
          label="🔁 Repeat chime"
          desc="Repeat up to 3×, spaced 2s apart."
          disabled={!p.chime}
          value={p.repeats}
          onChange={(v) => setP((prev) => ({ ...prev, repeats: v as 0 | 1 | 2 | 3 }))}
          options={[0, 1, 2, 3]}
        />

        <Row
          label="💬 Desktop notification"
          desc="System banner on segment end."
          onClick={toggle('notifications')}
          active={p.notifications}
        />

        <Row
          label="📳 Vibrate (mobile)"
          desc="Short vibration pattern."
          onClick={toggle('vibrate')}
          active={p.vibrate}
        />

        <div className="pt-4 border-t border-accent-subtle/20">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={testSound}
              className="px-4 py-2 rounded-xl bg-accent text-white hover:opacity-90 active:opacity-80 font-medium"
            >
              🎵 Test Sound
            </button>
            {!p.unlockedAudio && (
              <span className="text-sm opacity-70">
                Tap "Test Sound" once to enable audio on iOS.
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-accent-subtle/20 hover:bg-accent-subtle/30 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  desc,
  active,
  onClick,
  disabled,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between gap-4 px-3 py-2 rounded-xl transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent-subtle/10'
      }`}
    >
      <div className="text-left flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-sm opacity-70">{desc}</div>
      </div>
      <Toggle on={active} />
    </button>
  );
}

function RowSelect({
  label,
  desc,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  desc: string;
  value: number;
  onChange: (v: number) => void;
  options: number[];
  disabled?: boolean;
}) {
  return (
    <div
      className={`w-full flex items-center justify-between gap-4 px-3 py-2 rounded-xl ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <div className="text-left flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-sm opacity-70">{desc}</div>
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="bg-card border border-accent-subtle/30 rounded-lg px-3 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}×
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-black/10 dark:bg-white/10'
      }`}
    >
      <span
        className={`h-6 w-6 bg-white rounded-full shadow transform transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </span>
  );
}

