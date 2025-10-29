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

export default function IntervalCustomizer({ onClose }: IntervalCustomizerProps) {
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
    onClose();
  };

  const handleReset = () => {
    setPreset(DEFAULT_PRESET);
    localStorage.setItem('pomopomoIntervals', JSON.stringify(DEFAULT_PRESET));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Customize Intervals</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="focus" className="block text-sm font-medium mb-2">
              🎯 Focus Duration (minutes)
            </label>
            <input
              type="number"
              id="focus"
              min="1"
              max="120"
              value={preset.focusDuration}
              onChange={(e) => setPreset({ ...preset, focusDuration: parseInt(e.target.value) || 25 })}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="shortBreak" className="block text-sm font-medium mb-2">
              ☕ Short Break (minutes)
            </label>
            <input
              type="number"
              id="shortBreak"
              min="1"
              max="60"
              value={preset.shortBreakDuration}
              onChange={(e) => setPreset({ ...preset, shortBreakDuration: parseInt(e.target.value) || 5 })}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="longBreak" className="block text-sm font-medium mb-2">
              🌴 Long Break (minutes)
            </label>
            <input
              type="number"
              id="longBreak"
              min="1"
              max="60"
              value={preset.longBreakDuration}
              onChange={(e) => setPreset({ ...preset, longBreakDuration: parseInt(e.target.value) || 15 })}
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-ghost flex-1">
            Reset to Default
          </button>
          <button onClick={handleSave} className="btn-primary flex-1">
            Save Preferences
          </button>
        </div>

        <p className="text-xs opacity-60 text-center">
          These settings will be saved in your browser and applied when creating segments.
        </p>
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

