/**
 * Storage & Offline Caching Service
 * IndexedDB dual-tier store with seamless localStorage fallback
 */

import { GeoLocation, WeatherPayload, AppSettings, HistoricalClimateData } from '../types/weather';

const DB_NAME = 'atmos_weather_db';
const DB_VERSION = 2;
const STORE_WEATHER = 'weather_snapshots';
const STORE_HISTORICAL = 'historical_climate';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  units: {
    temperature: 'celsius',
    speed: 'kmh',
    pressure: 'hPa',
    precipitation: 'mm',
  },
  lowBandwidthMode: false,
  notificationsEnabled: false,
  alertThresholds: {
    windGustKmh: 65,
    extremeHeatC: 38,
    extremeColdC: -12,
    heavyPrecipMm: 25,
    rapidPressureDropHpa: 4,
    highUvIndex: 8,
    unhealthyAqi: 150,
  },
};

const DEFAULT_FAVORITES: GeoLocation[] = [
  { id: 2988507, name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France', country_code: 'FR' },
  { id: 5128581, name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'United States', country_code: 'US', admin1: 'New York' },
  { id: 1850147, name: 'Tokyo', latitude: 35.6895, longitude: 139.6917, country: 'Japan', country_code: 'JP' },
  { id: 2643743, name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'United Kingdom', country_code: 'GB' },
  { id: 2147714, name: 'Sydney', latitude: -33.8688, longitude: 151.2093, country: 'Australia', country_code: 'AU' },
];

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_WEATHER)) {
          db.createObjectStore(STORE_WEATHER, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORICAL)) {
          db.createObjectStore(STORE_HISTORICAL, { keyPath: 'cacheKey' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveWeatherToCache(payload: WeatherPayload): Promise<void> {
  const cacheKey = `${payload.latitude.toFixed(2)}_${payload.longitude.toFixed(2)}`;
  const record = {
    cacheKey,
    payload,
    timestamp: Date.now(),
  };

  // 1. Save in IndexedDB
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_WEATHER, 'readwrite');
      tx.objectStore(STORE_WEATHER).put(record);
    }
  } catch (err) {
    console.warn('IndexedDB write error:', err);
  }

  // 2. Save latest to localStorage for quick restore
  try {
    localStorage.setItem(`atmos_weather_last_${cacheKey}`, JSON.stringify(record));
    localStorage.setItem('atmos_weather_latest_key', cacheKey);
  } catch (e) {
    console.warn('LocalStorage write warning:', e);
  }
}

export async function getWeatherFromCache(lat: number, lon: number): Promise<WeatherPayload | null> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

  // Try IndexedDB first
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_WEATHER, 'readonly');
      const store = tx.objectStore(STORE_WEATHER);
      const req = store.get(cacheKey);
      const result = await new Promise<{ payload: WeatherPayload; timestamp: number } | null>((res) => {
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      });
      if (result && result.payload) {
        return { ...result.payload, isCached: true };
      }
    }
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(`atmos_weather_last_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.payload) {
        return { ...parsed.payload, isCached: true };
      }
    }
  } catch (e) {
    console.warn('LocalStorage read warning:', e);
  }

  return null;
}

export async function saveHistoricalToCache(key: string, data: HistoricalClimateData): Promise<void> {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_HISTORICAL, 'readwrite');
      tx.objectStore(STORE_HISTORICAL).put({
        cacheKey: key,
        data,
        timestamp: Date.now(),
      });
    }
  } catch {
    // ignore
  }
}

export async function getHistoricalFromCache(key: string): Promise<HistoricalClimateData | null> {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_HISTORICAL, 'readonly');
      const store = tx.objectStore(STORE_HISTORICAL);
      const req = store.get(key);
      const result = await new Promise<{ data: HistoricalClimateData } | null>((res) => {
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      });
      return result?.data || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function getFavorites(): GeoLocation[] {
  try {
    const stored = localStorage.getItem('atmos_favorites');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_FAVORITES;
}

export function saveFavorites(favorites: GeoLocation[]) {
  try {
    localStorage.setItem('atmos_favorites', JSON.stringify(favorites));
  } catch (e) {
    console.warn(e);
  }
}

export function getSearchHistory(): GeoLocation[] {
  try {
    const stored = localStorage.getItem('atmos_search_history');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

export function addToSearchHistory(location: GeoLocation) {
  try {
    const list = getSearchHistory().filter((l) => l.latitude !== location.latitude || l.longitude !== location.longitude);
    list.unshift(location);
    localStorage.setItem('atmos_search_history', JSON.stringify(list.slice(0, 8)));
  } catch (e) {
    console.warn(e);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('atmos_settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings) {
  try {
    localStorage.setItem('atmos_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn(e);
  }
}

export async function getCacheStatistics(): Promise<{ snapshotCount: number; approxBytes: number }> {
  let count = 0;
  let bytes = 0;
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_WEATHER, 'readonly');
      const store = tx.objectStore(STORE_WEATHER);
      const allReq = store.getAll();
      const records = await new Promise<any[]>((res) => {
        allReq.onsuccess = () => res(allReq.result || []);
        allReq.onerror = () => res([]);
      });
      count = records.length;
      bytes = new Blob([JSON.stringify(records)]).size;
    }
  } catch (e) {
    console.warn(e);
  }
  return { snapshotCount: count, approxBytes: bytes };
}

export async function clearOfflineCache(): Promise<void> {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction([STORE_WEATHER, STORE_HISTORICAL], 'readwrite');
      tx.objectStore(STORE_WEATHER).clear();
      tx.objectStore(STORE_HISTORICAL).clear();
    }
    // Clear localStorage weather keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('atmos_weather_last_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn(e);
  }
}
