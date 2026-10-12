/**
 * Professional Weather Dashboard
 * Ultra-analytical live atmospheric telemetry, climate trends, Open-Meteo API, offline caching
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GeoLocation,
  WeatherPayload,
  AppSettings,
  SevereWeatherAlert,
} from './types/weather';
import {
  fetchLiveWeather,
  searchLocations,
} from './services/openMeteo';
import {
  getStoredSettings,
  saveStoredSettings,
  getFavorites,
  saveFavorites,
  getSearchHistory,
  addToSearchHistory,
  saveWeatherToCache,
  getWeatherFromCache,
} from './services/storage';
import {
  analyzeSevereWeather,
  dispatchWeatherNotification,
} from './services/notifications';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { CurrentAtmosphere } from './components/CurrentAtmosphere';
import { HourlyTimelineChart } from './components/HourlyTimelineChart';
import { DailyForecastList } from './components/DailyForecastList';
import { AtmosphericBento } from './components/AtmosphericBento';
import { HistoricalClimateAnalysis } from './components/HistoricalClimateAnalysis';
import { SevereAlertsModal } from './components/SevereAlertsModal';
import { SettingsModal } from './components/SettingsModal';
import { Loader2, AlertCircle, RefreshCw, Compass } from 'lucide-react';

const INITIAL_LOCATION: GeoLocation = {
  id: 2988507,
  name: 'Paris',
  latitude: 48.8566,
  longitude: 2.3522,
  country: 'France',
  country_code: 'FR',
  timezone: 'Europe/Paris',
};

export default function App() {
  const [location, setLocation] = useState<GeoLocation>(() => {
    try {
      const saved = localStorage.getItem('atmos_active_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_LOCATION;
  });

  const [settings, setSettings] = useState<AppSettings>(getStoredSettings);
  const [favorites, setFavorites] = useState<GeoLocation[]>(getFavorites);
  const [searchHistory, setSearchHistory] = useState<GeoLocation[]>(getSearchHistory);
  const [payload, setPayload] = useState<WeatherPayload | null>(null);
  const [alerts, setAlerts] = useState<SevereWeatherAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isOnline = useOnlineStatus();

  // 1. Theme handler (supports device default / system, dark, and light)
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (settings.theme === 'system') {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } else if (settings.theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (settings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [settings.theme]);

  // 2. Load weather data for active location
  const loadWeatherData = useCallback(
    async (targetLoc: GeoLocation, forceNetwork = false) => {
      setError(null);
      if (!payload) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await fetchLiveWeather(targetLoc, {
          lowBandwidth: settings.lowBandwidthMode,
          forceNetwork,
        });
        setPayload(data);

        // Analyze severe weather
        const detectedAlerts = analyzeSevereWeather(data, settings);
        setAlerts(detectedAlerts);

        // Dispatch push notifications if extreme alert found and enabled
        if (detectedAlerts.length > 0 && settings.notificationsEnabled) {
          const highAlert = detectedAlerts[0];
          dispatchWeatherNotification(
            `${highAlert.severity.toUpperCase()}: ${highAlert.title}`,
            `${highAlert.parameter}: ${highAlert.detectedValue} for ${targetLoc.name}.`
          );
        }
      } catch (err: any) {
        console.warn('Weather fetch warning:', err);
        // Try fallback to cache
        const cached = await getWeatherFromCache(targetLoc.latitude, targetLoc.longitude);
        if (cached) {
          setPayload(cached);
          setAlerts(analyzeSevereWeather(cached, settings));
        } else {
          setError(
            err.message || 'Unable to retrieve weather data. Please check internet connectivity.'
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [settings, payload]
  );

  useEffect(() => {
    loadWeatherData(location);
    try {
      localStorage.setItem('atmos_active_location', JSON.stringify(location));
    } catch {}
  }, [location.latitude, location.longitude]);

  // Handle location selection
  const handleSelectLocation = (newLoc: GeoLocation) => {
    setLocation(newLoc);
    addToSearchHistory(newLoc);
    setSearchHistory(getSearchHistory());
  };

  // Toggle favorites
  const handleToggleFavorite = (loc: GeoLocation) => {
    const exists = favorites.some(
      (f) =>
        Math.abs(f.latitude - loc.latitude) < 0.01 &&
        Math.abs(f.longitude - loc.longitude) < 0.01
    );
    let updated: GeoLocation[];
    if (exists) {
      updated = favorites.filter(
        (f) =>
          Math.abs(f.latitude - loc.latitude) >= 0.01 ||
          Math.abs(f.longitude - loc.longitude) >= 0.01
      );
    } else {
      updated = [...favorites, loc];
    }
    setFavorites(updated);
    saveFavorites(updated);
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    if (payload) {
      setAlerts(analyzeSevereWeather(payload, newSettings));
    }
  };

  // Geolocation detector
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Attempt reverse geocoding or set coordinate location
        try {
          const res = await searchLocations(`${latitude.toFixed(2)},${longitude.toFixed(2)}`);
          if (res.length > 0) {
            handleSelectLocation(res[0]);
          } else {
            handleSelectLocation({
              id: Date.now(),
              name: 'My Location',
              latitude,
              longitude,
              country: 'Local Telemetry',
            });
          }
        } catch {
          handleSelectLocation({
            id: Date.now(),
            name: 'Current Coordinates',
            latitude,
            longitude,
          });
        }
      },
      (err) => {
        setIsRefreshing(false);
        console.warn('Geolocation failed:', err);
        alert('Could not access device location. Please enable location permissions or search manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Offline Connectivity & Cache Indicator */}
      <OfflineBanner
        isCachedData={payload?.isCached}
        cachedTime={payload?.fetchedAt}
      />

      {/* Main Analytical Navigation & Search Header */}
      <Header
        currentLocation={location}
        onSelectLocation={handleSelectLocation}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        alerts={alerts}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        searchHistory={searchHistory}
        isSearching={isRefreshing}
        onUseCurrentLocation={handleUseCurrentLocation}
      />

      {/* Primary Dashboard Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        {isLoading && !payload ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 animate-pulse">
              <Compass className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Gathering atmospheric telemetry from Open-Meteo API...
            </p>
          </div>
        ) : error && !payload ? (
          <div className="mx-auto my-12 max-w-md rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-lg dark:border-rose-900/40 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Telemetry Signal Interrupted
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => loadWeatherData(location, true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
            </button>
          </div>
        ) : payload ? (
          <div className="space-y-5">
            {/* Live Atmospheric Telemetry Card */}
            <CurrentAtmosphere
              payload={payload}
              units={settings.units}
              onRefresh={() => loadWeatherData(location, true)}
              isRefreshing={isRefreshing}
              activeAlerts={alerts}
              onOpenAlerts={() => setIsAlertsOpen(true)}
            />

            {/* Interactive Hourly Timeline & Spline Chart */}
            <HourlyTimelineChart
              hourly={payload.hourly}
              units={settings.units}
            />

            {/* 7-Day Synoptic Forecast Outlook */}
            <DailyForecastList
              daily={payload.daily}
              units={settings.units}
            />

            {/* Atmospheric Diagnostics Matrix (Barometer, Wind Rose, AQI, Solar, Moisture) */}
            <AtmosphericBento
              payload={payload}
              units={settings.units}
            />

            {/* Historical Climate Trends & Long-Term Anomaly Analysis */}
            <HistoricalClimateAnalysis
              location={location}
              units={settings.units}
            />
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-4 dark:border-slate-800/80 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Professional Atmospheric & Climate Telemetry • Powered by Open-Meteo Weather API
          </span>
          <span className="font-mono text-[11px]">
            Station: {location.name} ({location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°)
          </span>
        </div>
      </footer>

      {/* Severe Weather Alerts Modal */}
      <SevereAlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        cityName={location.name}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />
    </div>
  );
}
