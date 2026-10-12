import React, { useState, useEffect } from 'react';
import {
  Sliders,
  X,
  Gauge,
  Thermometer,
  Wind,
  Droplets,
  Database,
  Trash2,
  Zap,
  Bell,
  Check,
  Laptop,
  Moon,
  Sun,
} from 'lucide-react';
import { AppSettings } from '../types/weather';
import { getCacheStatistics, clearOfflineCache } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [cacheStats, setCacheStats] = useState<{ snapshotCount: number; approxBytes: number }>({
    snapshotCount: 0,
    approxBytes: 0,
  });
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    if (isOpen) {
      getCacheStatistics().then(setCacheStats);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    await clearOfflineCache();
    setCacheCleared(true);
    const updated = await getCacheStatistics();
    setCacheStats(updated);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Station & Telemetry Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Measurement units, low-bandwidth optimizations, and offline cache
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Theme Preference */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Appearance Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'system', label: 'Device Default', icon: Laptop },
                  { id: 'dark', label: 'Atmospheric Dark', icon: Moon },
                  { id: 'light', label: 'High-Contrast Light', icon: Sun },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const active = localSettings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setLocalSettings({ ...localSettings, theme: t.id })}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                      active
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-500/10 dark:text-sky-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit Preferences */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Unit Standards
            </label>

            {/* Temperature */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Thermometer className="h-4 w-4 text-sky-500" />
                <span>Temperature Unit</span>
              </div>
              <div className="flex rounded-xl bg-slate-200/70 p-0.5 dark:bg-slate-700">
                <button
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      units: { ...localSettings.units, temperature: 'celsius' },
                    })
                  }
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    localSettings.units.temperature === 'celsius'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Celsius (°C)
                </button>
                <button
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      units: { ...localSettings.units, temperature: 'fahrenheit' },
                    })
                  }
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    localSettings.units.temperature === 'fahrenheit'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>

            {/* Wind Speed */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Wind className="h-4 w-4 text-emerald-500" />
                <span>Wind Velocity</span>
              </div>
              <select
                value={localSettings.units.speed}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    units: { ...localSettings.units, speed: e.target.value as any },
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              >
                <option value="kmh">Kilometers / Hour (km/h)</option>
                <option value="mph">Miles / Hour (mph)</option>
                <option value="ms">Meters / Second (m/s)</option>
                <option value="knots">Nautical Knots (kt)</option>
              </select>
            </div>

            {/* Barometric Pressure */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Gauge className="h-4 w-4 text-purple-500" />
                <span>Atmospheric Pressure</span>
              </div>
              <select
                value={localSettings.units.pressure}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    units: { ...localSettings.units, pressure: e.target.value as any },
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              >
                <option value="hPa">Hectopascals (hPa)</option>
                <option value="inHg">Inches of Mercury (inHg)</option>
                <option value="mmHg">Millimeters of Mercury (mmHg)</option>
              </select>
            </div>
          </div>

          {/* Low Bandwidth Mode Toggle */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Data Saver / Low-Bandwidth Mode
                </span>
              </div>
              <button
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    lowBandwidthMode: !localSettings.lowBandwidthMode,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localSettings.lowBandwidthMode ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    localSettings.lowBandwidthMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Reduces HTTP payload sizes by ~60%, truncates forecast hourly intervals, skips non-critical secondary aerosols, and relies heavily on local cached snapshots.
            </p>
          </div>

          {/* Offline Caching & Storage Diagnostics */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Offline IndexedDB Cache
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {cacheStats.snapshotCount} Snapshots • {(cacheStats.approxBytes / 1024).toFixed(1)} KB
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every viewed station is automatically saved to browser storage for instant offline access and seamless operation when disconnected.
            </p>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/20 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{cacheCleared ? 'Cache Purged!' : 'Clear Offline Cache'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-sm transition"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
