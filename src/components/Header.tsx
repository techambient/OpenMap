import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Compass,
  Bell,
  Sliders,
  Sun,
  Moon,
  Laptop,
  Download,
  Check,
  X,
  Zap,
  Star,
  History,
  Loader2,
} from 'lucide-react';
import { GeoLocation, AppSettings, SevereWeatherAlert } from '../types/weather';
import { searchLocations } from '../services/openMeteo';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentLocation: GeoLocation;
  onSelectLocation: (loc: GeoLocation) => void;
  favorites: GeoLocation[];
  onToggleFavorite: (loc: GeoLocation) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  alerts: SevereWeatherAlert[];
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
  searchHistory: GeoLocation[];
  isSearching: boolean;
  onUseCurrentLocation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onSelectLocation,
  favorites,
  onToggleFavorite,
  settings,
  onUpdateSettings,
  alerts,
  onOpenAlerts,
  onOpenSettings,
  searchHistory,
  onUseCurrentLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const isFavorite = favorites.some(
    (f) =>
      Math.abs(f.latitude - currentLocation.latitude) < 0.01 &&
      Math.abs(f.longitude - currentLocation.longitude) < 0.01
  );

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearchingApi(false);
      return;
    }

    setIsSearchingApi(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocations(query);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setIsSearchingApi(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: GeoLocation) => {
    onSelectLocation(loc);
    setIsDropdownOpen(false);
    setQuery('');
  };

  const cycleTheme = () => {
    const modes: Array<'system' | 'dark' | 'light'> = ['system', 'dark', 'light'];
    const next = modes[(modes.indexOf(settings.theme) + 1) % modes.length];
    onUpdateSettings({ ...settings, theme: next });
  };

  const toggleUnit = () => {
    const nextTemp = settings.units.temperature === 'celsius' ? 'fahrenheit' : 'celsius';
    const nextSpeed = nextTemp === 'fahrenheit' ? 'mph' : 'kmh';
    const nextPressure = nextTemp === 'fahrenheit' ? 'inHg' : 'hPa';
    const nextPrecip = nextTemp === 'fahrenheit' ? 'inch' : 'mm';
    onUpdateSettings({
      ...settings,
      units: {
        temperature: nextTemp,
        speed: nextSpeed,
        pressure: nextPressure,
        precipitation: nextPrecip,
      },
    });
  };

  const toggleLowBandwidth = () => {
    onUpdateSettings({
      ...settings,
      lowBandwidthMode: !settings.lowBandwidthMode,
    });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Top Row: Brand, Search, Action Controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Brand & Location Indicator */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sky-400 shadow-sm dark:bg-sky-500/10 dark:text-sky-400 dark:border dark:border-sky-500/20">
                <Compass className="h-5 w-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                    AtmosTrack
                  </h1>
                  <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/10 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Open-Meteo Analytical Telemetry
                </p>
              </div>
            </div>

            {/* Mobile Actions Shortcut */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                id="mobile-unit-toggle"
                onClick={toggleUnit}
                className="flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Toggle temperature unit"
              >
                °{settings.units.temperature === 'celsius' ? 'C' : 'F'}
              </button>

              <button
                id="mobile-alerts-btn"
                onClick={onOpenAlerts}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg border ${
                  alerts.length > 0
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
                title="Severe Alerts"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Box with Autocomplete */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                id="city-search-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search worldwide city, airport, coordinates..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-20 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-800 transition"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {isSearchingApi && (
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                )}
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  id="geolocation-btn"
                  onClick={onUseCurrentLocation}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400"
                  title="Detect my atmospheric location"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && (
              <div
                id="search-autocomplete-dropdown"
                className="absolute left-0 right-0 top-full mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50 divide-y divide-slate-100 dark:divide-slate-800"
              >
                {results.length > 0 ? (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Search Results
                    </div>
                    {results.map((loc) => (
                      <button
                        key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                        onClick={() => handleSelect(loc)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {loc.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
                              {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                        </span>
                      </button>
                    ))}
                  </div>
                ) : query.trim().length >= 2 && !isSearchingApi ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No matching cities found for "{query}".
                  </div>
                ) : null}

                {/* Recent Searches */}
                {searchHistory.length > 0 && results.length === 0 && (
                  <div className="py-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <History className="h-3 w-3" /> Recent Coordinates
                    </div>
                    {searchHistory.map((loc) => (
                      <button
                        key={`history-${loc.id}-${loc.latitude}`}
                        onClick={() => handleSelect(loc)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {loc.name}, {loc.country}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {loc.latitude.toFixed(1)}°, {loc.longitude.toFixed(1)}°
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Analytical Controls & Utilities */}
          <div className="hidden md:flex items-center gap-2">
            {/* Low Bandwidth Toggle */}
            <button
              id="low-bandwidth-toggle"
              onClick={toggleLowBandwidth}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                settings.lowBandwidthMode
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="Data Saver: Compact hourly payloads and throttled background sync"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{settings.lowBandwidthMode ? 'Data Saver ON' : 'Data Saver'}</span>
            </button>

            {/* Units Toggle */}
            <button
              id="units-toggle-desktop"
              onClick={toggleUnit}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
              title="Switch Units (°C/km/h or °F/mph)"
            >
              <span>°{settings.units.temperature === 'celsius' ? 'C' : 'F'}</span>
              <span className="text-[10px] font-normal text-slate-400">/</span>
              <span className="text-[11px] font-medium text-slate-500">
                {settings.units.speed}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={cycleTheme}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title={`Theme: ${settings.theme} (click to cycle System / Dark / Light)`}
            >
              {settings.theme === 'system' ? (
                <Laptop className="h-4 w-4" />
              ) : settings.theme === 'dark' ? (
                <Moon className="h-4 w-4 text-sky-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

            {/* Severe Alerts Bell */}
            <button
              id="desktop-alerts-btn"
              onClick={onOpenAlerts}
              className={`relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                alerts.length > 0
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:border-rose-500/30 dark:text-rose-400 animate-pulse'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="Active Atmospheric Alerts"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Alerts</span>
              {alerts.length > 0 && (
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* PWA Install Button */}
            {isInstallable && !isInstalled && (
              <button
                id="pwa-install-btn"
                onClick={install}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition"
                title="Install Progressive Web App"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install</span>
              </button>
            )}

            {isIOS && !isInstalled && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>iOS App</span>
              </button>
            )}

            {/* Settings Modal Trigger */}
            <button
              id="settings-modal-btn"
              onClick={onOpenSettings}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="Atmospheric Station Settings"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Sub-Row: Location Name + Quick Favorite Cities Bar */}
        <div className="mt-2.5 flex items-center justify-between overflow-x-auto no-scrollbar gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onToggleFavorite(currentLocation)}
              className={`p-1 rounded-md transition ${
                isFavorite
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Bookmark this station'}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {currentLocation.name}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {[currentLocation.admin1, currentLocation.country].filter(Boolean).join(', ')}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {currentLocation.latitude.toFixed(2)}°N, {currentLocation.longitude.toFixed(2)}°E
            </span>
          </div>

          {/* Quick Favorite Stations Pill Carousel */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
              Saved Stations:
            </span>
            {favorites.map((fav) => {
              const active =
                Math.abs(fav.latitude - currentLocation.latitude) < 0.01 &&
                Math.abs(fav.longitude - currentLocation.longitude) < 0.01;
              return (
                <button
                  key={`fav-pill-${fav.id}`}
                  onClick={() => onSelectLocation(fav)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-sky-500/20 dark:text-sky-300 dark:border dark:border-sky-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {fav.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* iOS Install Helper Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Install Weather App on iOS
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To install this professional weather app on your iPhone or iPad home screen:
            </p>
            <ol className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200 list-decimal list-inside">
              <li>Tap the <strong>Share</strong> icon in Safari's bottom toolbar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
