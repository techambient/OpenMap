/**
 * Meteorological Calculations & Unit Conversions
 */

import { UnitPreferences } from '../types/weather';

export function formatTemp(celsius: number | null | undefined, unit: 'celsius' | 'fahrenheit'): string {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
  if (unit === 'fahrenheit') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatTempNumber(celsius: number | null | undefined, unit: 'celsius' | 'fahrenheit'): number {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return 0;
  if (unit === 'fahrenheit') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

export function formatSpeed(kmh: number | null | undefined, unit: 'kmh' | 'mph' | 'ms' | 'knots'): string {
  if (kmh === null || kmh === undefined || isNaN(kmh)) return '--';
  switch (unit) {
    case 'mph':
      return `${Math.round(kmh * 0.621371)} mph`;
    case 'ms':
      return `${(kmh / 3.6).toFixed(1)} m/s`;
    case 'knots':
      return `${Math.round(kmh * 0.539957)} kt`;
    case 'kmh':
    default:
      return `${Math.round(kmh)} km/h`;
  }
}

export function formatPressure(hpa: number | null | undefined, unit: 'hPa' | 'inHg' | 'mmHg'): string {
  if (hpa === null || hpa === undefined || isNaN(hpa)) return '--';
  switch (unit) {
    case 'inHg':
      return `${(hpa * 0.02953).toFixed(2)} inHg`;
    case 'mmHg':
      return `${Math.round(hpa * 0.750062)} mmHg`;
    case 'hPa':
    default:
      return `${Math.round(hpa)} hPa`;
  }
}

export function formatPrecip(mm: number | null | undefined, unit: 'mm' | 'inch'): string {
  if (mm === null || mm === undefined || isNaN(mm)) return '0.0 mm';
  if (unit === 'inch') {
    return `${(mm * 0.0393701).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

export function getWindDirectionCardinal(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx];
}

export function getBeaufortScale(kmh: number): { force: number; description: string } {
  if (kmh < 2) return { force: 0, description: 'Calm' };
  if (kmh <= 5) return { force: 1, description: 'Light Air' };
  if (kmh <= 11) return { force: 2, description: 'Light Breeze' };
  if (kmh <= 19) return { force: 3, description: 'Gentle Breeze' };
  if (kmh <= 28) return { force: 4, description: 'Moderate Breeze' };
  if (kmh <= 38) return { force: 5, description: 'Fresh Breeze' };
  if (kmh <= 49) return { force: 6, description: 'Strong Breeze' };
  if (kmh <= 61) return { force: 7, description: 'High Wind / Near Gale' };
  if (kmh <= 74) return { force: 8, description: 'Gale' };
  if (kmh <= 88) return { force: 9, description: 'Severe Gale' };
  if (kmh <= 102) return { force: 10, description: 'Storm' };
  if (kmh <= 117) return { force: 11, description: 'Violent Storm' };
  return { force: 12, description: 'Hurricane Force' };
}

export function getUVCategory(uv: number): { level: string; color: string; advice: string } {
  if (uv < 3) return { level: 'Low', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', advice: 'No protection needed.' };
  if (uv < 6) return { level: 'Moderate', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', advice: 'Wear sunglasses & hat outdoors.' };
  if (uv < 8) return { level: 'High', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', advice: 'SPF 30+ sunscreen recommended.' };
  if (uv < 11) return { level: 'Very High', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', advice: 'Seek shade during midday.' };
  return { level: 'Extreme', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', advice: 'Minimize midday sun exposure.' };
}

export function getAQICategory(aqi: number): { category: string; color: string; desc: string } {
  if (aqi <= 50) return { category: 'Good', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', desc: 'Air quality is satisfactory and poses little to no risk.' };
  if (aqi <= 100) return { category: 'Moderate', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', desc: 'Acceptable; sensitive individuals may experience minor symptoms.' };
  if (aqi <= 150) return { category: 'Sensitive Groups', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', desc: 'General public not affected; sensitive groups may feel effects.' };
  if (aqi <= 200) return { category: 'Unhealthy', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', desc: 'Increased likelihood of adverse effects in general public.' };
  if (aqi <= 300) return { category: 'Very Unhealthy', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', desc: 'Health alert: serious risk to respiratory health.' };
  return { category: 'Hazardous', color: 'text-red-700 bg-red-700/10 border-red-700/20', desc: 'Emergency conditions; entire population likely affected.' };
}

export function formatISOTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function formatISODate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
