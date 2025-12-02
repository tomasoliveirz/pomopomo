'use client';
import { useEffect, useState } from 'react';
import { loadPrefs, savePrefs, AlertPrefs } from '@/alerts/prefs';
import { ensureNotificationPermission, unlockAudioOnce, playEndChime } from '@/alerts/helpers';

export function AlertsContent() {
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
        new Notification('POMOPOMO Alerts Enabled!', {
          body: 'You\'ll get notified when segments end.',
          silent: true,
          icon: '/branding/logo.svg',
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
    <div className="space-y-6">
      {saved && (
        <div className="text-sm font-bold text-center py-2 bg-accent/10 text-accent rounded-xl animate-fade-in">
          ✓ Saved
        </div>
      )}

      <div className="space-y-2">
        <Row
          label="🔔 End chime"
          desc="Short high-pitch pop when a segment ends."
          onClick={toggle('chime')}
          active={p.chime}
        />

        <Row
          label="📢 Boost loudness"
          desc="Slightly louder/denser chime."
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
      </div>

      <div className="pt-6 border-t border-black/5">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={testSound}
            className="px-6 py-3 rounded-2xl bg-accent text-white hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_-5px_rgba(var(--accent-rgb),0.3)] font-bold text-sm"
          >
            🎵 Test Sound
          </button>
          {!p.unlockedAudio && (
            <span className="text-xs font-medium opacity-60 max-w-[200px] leading-tight">
              Tap "Test Sound" once to enable audio on iOS.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsSettings({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="max-w-md w-full rounded-[2.5rem] p-8 bg-white/90 backdrop-blur-xl text-text shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-6 max-h-[90vh] overflow-y-auto border border-white/50">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold font-display tracking-tight text-text/90">🔔 Alert Settings</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <AlertsContent />

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-4 px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold text-text/70 hover:text-text transition-all active:scale-[0.98]"
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
      className={`w-full flex items-center justify-between gap-4 px-3 py-2 rounded-xl transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent-subtle/10'
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
      className={`w-full flex items-center justify-between gap-4 px-3 py-2 rounded-xl ${disabled ? 'opacity-40' : ''
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
      className={`inline-flex h-7 w-12 items-center rounded-full transition-colors ${on ? 'bg-accent' : 'bg-black/10 dark:bg-white/10'
        }`}
    >
      <span
        className={`h-6 w-6 bg-white rounded-full shadow transform transition-transform ${on ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </span>
  );
}

