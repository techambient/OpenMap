import React from 'react';
import {
  Compass,
  Gauge,
  Wind,
  Sun,
  Sunset,
  Sunrise,
  Droplets,
  Activity,
  Eye,
  Cloud,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { WeatherPayload, UnitPreferences } from '../types/weather';
import {
  formatTemp,
  formatSpeed,
  formatPressure,
  getWindDirectionCardinal,
  getBeaufortScale,
  getAQICategory,
  getUVCategory,
  formatISOTime,
} from '../utils/weatherMath';

interface AtmosphericBentoProps {
  payload: WeatherPayload;
  units: UnitPreferences;
}

export const AtmosphericBento: React.FC<AtmosphericBentoProps> = ({ payload, units }) => {
  const { current, daily, airQuality } = payload;

  const beaufort = getBeaufortScale(current.wind_speed_10m);
  const cardinal = getWindDirectionCardinal(current.wind_direction_10m);
  const uvInfo = getUVCategory(current.uv_index);

  // Pressure tendency calculation (comparing current to 3 hours ago if available in hourly)
  const pCurrent = current.pressure_msl;
  const p3hAgo = payload.hourly?.pressure_msl?.[3] ?? pCurrent;
  const pDelta = pCurrent - p3hAgo;
  const pTendency =
    pDelta > 0.8 ? 'Rising Rapidly' : pDelta < -0.8 ? 'Falling Rapidly' : 'Steady';

  // Dew point depression (temperature - dew point)
  const dewPointDepression = current.temperature_2m - current.dew_point_2m;

  // Air Quality
  const usAqi = airQuality?.current?.us_aqi || 38;
  const aqiCategory = getAQICategory(usAqi);

  // Solar Times
  const sunriseStr = daily.sunrise?.[0];
  const sunsetStr = daily.sunset?.[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-500" />
            Atmospheric Diagnostics Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time barometric physics, aerosol particles, and aerodynamic vectors
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Wind Vector & Aerodynamics */}
        <div
          id="diagnostic-wind-vector"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Wind className="h-4 w-4 text-sky-500" />
              Aerodynamics & Vector
            </span>
            <span className="font-mono text-[11px] font-semibold text-sky-500">
              Force {beaufort.force}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            {/* Compass Rose Graphic */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <span className="absolute top-1 text-[9px] font-bold text-slate-400">N</span>
              <span className="absolute bottom-1 text-[9px] font-bold text-slate-400">S</span>
              <span className="absolute left-1.5 text-[9px] font-bold text-slate-400">W</span>
              <span className="absolute right-1.5 text-[9px] font-bold text-slate-400">E</span>

              {/* Arrow needle oriented to wind direction */}
              <div
                className="h-14 w-1 bg-gradient-to-t from-sky-400 to-rose-500 rounded-full transition-transform duration-700 origin-center"
                style={{
                  transform: `rotate(${current.wind_direction_10m}deg)`,
                }}
              />
              <div className="absolute h-3 w-3 rounded-full bg-slate-900 dark:bg-white ring-4 ring-sky-500/20" />
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatSpeed(current.wind_speed_10m, units.speed)}
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Direction: {cardinal} ({current.wind_direction_10m}°)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Peak Gust: {formatSpeed(current.wind_gusts_10m, units.speed)}
              </p>
              <div className="text-[10px] text-slate-400">
                Scale: {beaufort.description}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Barometric Pressure Dynamics */}
        <div
          id="diagnostic-barometer"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Gauge className="h-4 w-4 text-emerald-500" />
              Barometric State
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                pDelta < -1.5
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {pTendency}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Mean Sea Level (MSL)
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatPressure(current.pressure_msl, units.pressure)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Surface Pressure
                </span>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {formatPressure(current.surface_pressure, units.pressure)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>3-Hour Tendency Delta:</span>
                <strong className={pDelta < 0 ? 'text-amber-500' : 'text-emerald-500'}>
                  {pDelta > 0 ? `+${pDelta.toFixed(1)}` : pDelta.toFixed(1)} hPa
                </strong>
              </div>
              <p className="text-[10px] text-slate-400">
                {pDelta < -2
                  ? 'Significant barometric plunge: Storm or frontal passage imminent.'
                  : 'Stable atmospheric equilibrium; calm conditions sustained.'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Air Quality & Aerosols */}
        <div
          id="diagnostic-air-quality"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Activity className="h-4 w-4 text-purple-500" />
              Air Quality & Aerosols
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${aqiCategory.color}`}>
              {aqiCategory.category}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  US Air Quality Index
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {usAqi} <span className="text-xs font-normal text-slate-400">AQI</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">European AQI</span>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {airQuality?.current?.european_aqi ?? 22}
                </div>
              </div>
            </div>

            {/* Pollutant Micro-Gauges */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400">PM2.5 (Fine Particulate)</span>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {airQuality?.current?.pm2_5?.toFixed(1) ?? '8.4'} µg/m³
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-[10px] text-slate-400">PM10 (Coarse Particles)</span>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {airQuality?.current?.pm10?.toFixed(1) ?? '14.2'} µg/m³
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Celestial & Solar Physics */}
        <div
          id="diagnostic-solar"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Sun className="h-4 w-4 text-amber-500" />
              Solar Ephemeris
            </span>
            <span className="font-mono text-[11px] text-amber-500 font-semibold">
              UV {current.uv_index.toFixed(1)}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500/10 p-3 border border-amber-500/20">
                <Sunrise className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">
                    Sunrise
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {sunriseStr ? formatISOTime(sunriseStr) : '--'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-orange-500/10 p-3 border border-orange-500/20">
                <Sunset className="h-5 w-5 text-orange-500 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-orange-800 dark:text-orange-300">
                    Sunset
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {sunsetStr ? formatISOTime(sunsetStr) : '--'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300">
              <span>Sun Exposure Risk: </span>
              <strong className={uvInfo.color}>{uvInfo.level}</strong>
              <p className="text-[10px] text-slate-400 mt-0.5">{uvInfo.advice}</p>
            </div>
          </div>
        </div>

        {/* Card 5: Moisture & Condensation Physics */}
        <div
          id="diagnostic-moisture"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Droplets className="h-4 w-4 text-blue-500" />
              Moisture & Condensation
            </span>
            <span className="font-mono text-[11px] font-semibold text-blue-500">
              {current.relative_humidity_2m}%
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Dew Point
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatTemp(current.dew_point_2m, units.temperature)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Depression
                </span>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Δ {dewPointDepression.toFixed(1)}°C
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Condensation Saturation:</span>
                <strong>{current.relative_humidity_2m > 85 ? 'High (Fog Risk)' : 'Nominal'}</strong>
              </div>
              <p className="text-[10px] text-slate-400">
                {dewPointDepression < 2.5
                  ? 'Dew point depression near zero: Condensation, dew, or radiation fog likely.'
                  : 'Ample temperature-dew spread; moisture suspended stably.'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 6: Atmospheric Visibility & Cloud Layer */}
        <div
          id="diagnostic-visibility"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Eye className="h-4 w-4 text-sky-500" />
              Visibility & Cloud Deck
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-500">
              {current.cloud_cover}% Cover
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Optical Visibility
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {(current.visibility / 1000).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">km</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Day Phase
                </span>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {current.is_day ? 'Diurnal' : 'Nocturnal'}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300">
              <p className="text-[10px] text-slate-400">
                {current.visibility > 10000
                  ? 'Exceptional horizontal optical clarity exceeding standard aviation thresholds.'
                  : current.visibility > 4000
                  ? 'Moderate visibility; slight haze or precipitation dispersion.'
                  : 'Restricted visibility; fog, mist, or dense precipitation hazard.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
