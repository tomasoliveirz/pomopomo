'use client';

import { useState, useEffect } from 'react';

interface IntervalPreset {
  focusDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
}

const DEFAULT_PRESET: IntervalPreset = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};

interface IntervalCustomizerProps {
  onClose: () => void;
}

export function IntervalsContent() {
  const [preset, setPreset] = useState<IntervalPreset>(DEFAULT_PRESET);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('pomopomoIntervals');
    if (saved) {
      try {
        setPreset(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load intervals', e);
      }
    }
  }, []);

  // Auto-save whenever preset changes
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('pomopomoIntervals', JSON.stringify(preset));
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [preset]);

  const handleSave = () => {
    localStorage.setItem('pomopomoIntervals', JSON.stringify(preset));
    // In the unified modal, we might not need to close, just save.
    // But if we want to show feedback, we can add it here.
  };

  const handleReset = () => {
    setPreset(DEFAULT_PRESET);
    localStorage.setItem('pomopomoIntervals', JSON.stringify(DEFAULT_PRESET));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <label htmlFor="focus" className="block text-sm font-bold ml-1 mb-2 text-text/70">
            🎯 Focus Duration (minutes)
          </label>
          <input
            type="number"
            id="focus"
            min="1"
            max="120"
            value={preset.focusDuration}
            onChange={(e) => setPreset({ ...preset, focusDuration: parseInt(e.target.value) || 25 })}
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-accent/20 focus:bg-white transition-all font-medium text-lg outline-none"
          />
        </div>

        <div>
          <label htmlFor="shortBreak" className="block text-sm font-bold ml-1 mb-2 text-text/70">
            ☕ Short Break (minutes)
          </label>
          <input
            type="number"
            id="shortBreak"
            min="1"
            max="60"
            value={preset.shortBreakDuration}
            onChange={(e) => setPreset({ ...preset, shortBreakDuration: parseInt(e.target.value) || 5 })}
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-accent/20 focus:bg-white transition-all font-medium text-lg outline-none"
          />
        </div>

        <div>
          <label htmlFor="longBreak" className="block text-sm font-bold ml-1 mb-2 text-text/70">
            🌴 Long Break (minutes)
          </label>
          <input
            type="number"
            id="longBreak"
            min="1"
            max="60"
            value={preset.longBreakDuration}
            onChange={(e) => setPreset({ ...preset, longBreakDuration: parseInt(e.target.value) || 15 })}
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-accent/20 focus:bg-white transition-all font-medium text-lg outline-none"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleReset}
          className="flex-1 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold text-text/60 hover:text-text transition-all active:scale-[0.98]"
        >
          Reset
        </button>
        {/* Save button is less critical with auto-save, but good for confirmation */}
        <button
          onClick={handleSave}
          className="flex-1 py-4 rounded-2xl bg-accent text-white font-bold shadow-[0_10px_20px_-5px_rgba(var(--accent-rgb),0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          Save
        </button>
      </div>

      <p className="text-xs font-medium opacity-40 text-center">
        These settings will be saved in your browser.
      </p>
    </div>
  );
}

export default function IntervalCustomizer({ onClose }: IntervalCustomizerProps) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="max-w-md w-full rounded-[2.5rem] p-8 bg-white/90 backdrop-blur-xl text-text shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-6 border border-white/50">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-display tracking-tight text-text/90">Customize Intervals</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-xl">✕</button>
        </div>

        <IntervalsContent />
      </div>
    </div>
  );
}

export function getCustomIntervals(): IntervalPreset {
  if (typeof window === 'undefined') return DEFAULT_PRESET;

  const saved = localStorage.getItem('pomopomoIntervals');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return DEFAULT_PRESET;
    }
  }
  return DEFAULT_PRESET;
}

