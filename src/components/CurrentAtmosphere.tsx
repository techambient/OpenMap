import React from 'react';
import {
  Sun,
  SunMedium,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  Snowflake,
  CloudSunRain,
  CloudLightning,
  Wind,
  Gauge,
  Droplets,
  Eye,
  Thermometer,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { WeatherPayload, UnitPreferences, SevereWeatherAlert } from '../types/weather';
import { getWeatherCondition } from '../services/openMeteo';
import {
  formatTemp,
  formatSpeed,
  formatPressure,
  formatPrecip,
  getWindDirectionCardinal,
  getBeaufortScale,
  getUVCategory,
} from '../utils/weatherMath';

interface CurrentAtmosphereProps {
  payload: WeatherPayload;
  units: UnitPreferences;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeAlerts: SevereWeatherAlert[];
  onOpenAlerts: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sun,
  SunMedium,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  Snowflake,
  CloudSunRain,
  CloudLightning,
};

export const CurrentAtmosphere: React.FC<CurrentAtmosphereProps> = ({
  payload,
  units,
  onRefresh,
  isRefreshing,
  activeAlerts,
  onOpenAlerts,
}) => {
  const { current, daily, location, fetchedAt, isCached } = payload;
  const condition = getWeatherCondition(current.weather_code);
  const IconComponent = ICON_MAP[condition.iconName] || Cloud;

  const todayMax = daily.temperature_2m_max?.[0];
  const todayMin = daily.temperature_2m_min?.[0];

  const beaufort = getBeaufortScale(current.wind_speed_10m);
  const cardinal = getWindDirectionCardinal(current.wind_direction_10m);
  const uvInfo = getUVCategory(current.uv_index);

  const updatedMinutesAgo = Math.max(0, Math.floor((Date.now() - fetchedAt) / 60000));

  return (
    <div className="space-y-3">
      {/* Severe Weather Alert Banner if present */}
      {activeAlerts.length > 0 && (
        <div
          id="active-severe-alert-banner"
          onClick={onOpenAlerts}
          className="cursor-pointer rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 backdrop-blur-sm transition hover:bg-rose-500/15"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shrink-0">
                <ShieldAlert className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    {activeAlerts[0].severity} Alert
                  </span>
                  <span className="text-[10px] text-rose-500/80 font-mono">
                    {activeAlerts.length} Active Notice{activeAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activeAlerts[0].title} — {activeAlerts[0].parameter}: {activeAlerts[0].detectedValue}
                </h4>
              </div>
            </div>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 underline decoration-rose-500/40 shrink-0">
              View Directives →
            </span>
          </div>
        </div>
      )}

      {/* Main Atmospheric Overview Card */}
      <div
        id="current-atmosphere-card"
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl dark:border-slate-800"
      >
        {/* Subtle background meteorological vector isobar rings */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full border border-sky-500/10 opacity-60" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 rounded-full border border-sky-400/15 opacity-60" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full border border-indigo-500/10 opacity-40" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          {/* Left Column: Location, Current Condition, Live Temperature */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300 border border-sky-500/30">
                Live Atmospheric Telemetry
              </span>
              {isCached && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                  Cached
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <div className="text-6xl sm:text-7xl font-extrabold tracking-tight font-sans text-white">
                {formatTemp(current.temperature_2m, units.temperature)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-7 w-7 text-sky-400" />
                  <span className="text-xl font-bold text-slate-100">
                    {condition.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span>
                    Feels like{' '}
                    <strong className="text-white">
                      {formatTemp(current.apparent_temperature, units.temperature)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-rose-300">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {formatTemp(todayMax, units.temperature)}
                  </span>
                  <span className="flex items-center gap-0.5 text-sky-300">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    {formatTemp(todayMin, units.temperature)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-md">
              {condition.description}. Surface pressure measured at{' '}
              {formatPressure(current.surface_pressure, units.pressure)} with {current.cloud_cover}% cloud cover.
            </p>
          </div>

          {/* Right Column: Key Diagnostic Gauges Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:w-auto">
            {/* Wind Vector */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1 font-medium">
                  <Wind className="h-3.5 w-3.5 text-sky-400" /> Wind
                </span>
                <span className="font-mono text-[10px] text-sky-300">{cardinal} ({current.wind_direction_10m}°)</span>
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {formatSpeed(current.wind_speed_10m, units.speed)}
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                Gusts {formatSpeed(current.wind_gusts_10m, units.speed)} • {beaufort.description}
              </div>
            </div>

            {/* Barometer */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1 font-medium">
                  <Gauge className="h-3.5 w-3.5 text-emerald-400" /> Pressure
                </span>
                <span className="text-[10px] text-emerald-300">MSL</span>
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {formatPressure(current.pressure_msl, units.pressure)}
              </div>
              <div className="text-[10px] text-slate-300">
                Surface: {formatPressure(current.surface_pressure, units.pressure)}
              </div>
            </div>

            {/* Humidity & Dew Point */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1 font-medium">
                  <Droplets className="h-3.5 w-3.5 text-blue-400" /> Humidity
                </span>
                <span className="text-[10px] text-blue-300">Sat</span>
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {current.relative_humidity_2m}%
              </div>
              <div className="text-[10px] text-slate-300">
                Dew Pt: {formatTemp(current.dew_point_2m, units.temperature)}
              </div>
            </div>

            {/* UV & Solar Irradiance */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1 font-medium">
                  <Sun className="h-3.5 w-3.5 text-amber-400" /> UV Index
                </span>
                <span className="text-[10px] font-semibold text-amber-300">
                  {uvInfo.level}
                </span>
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {current.uv_index.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                {uvInfo.advice}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta Bar: Refresh button, Last updated time, Coordinates */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Telemetry updated{' '}
              {updatedMinutesAgo === 0 ? 'just now' : `${updatedMinutesAgo}m ago`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-400">
              Elev: {payload.elevation}m • Timezone: {payload.timezone}
            </span>
            <button
              id="refresh-telemetry-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-50"
              title="Poll latest Open-Meteo atmospheric telemetry"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isRefreshing ? 'Polling...' : 'Sync Telemetry'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
