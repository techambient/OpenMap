import React, { useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Droplets,
  Wind,
  Sun,
  Sunrise,
  Sunset,
  Shield,
  CloudRain,
} from 'lucide-react';
import { DailyForecast, UnitPreferences } from '../types/weather';
import { getWeatherCondition } from '../services/openMeteo';
import {
  formatTemp,
  formatTempNumber,
  formatSpeed,
  formatPrecip,
  getWindDirectionCardinal,
  formatISODate,
  formatISOTime,
} from '../utils/weatherMath';

interface DailyForecastListProps {
  daily: DailyForecast;
  units: UnitPreferences;
}

export const DailyForecastList: React.FC<DailyForecastListProps> = ({ daily, units }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const daysCount = daily.time.length;

  // Global week min & max to normalize temperature range bars
  const allMins = daily.temperature_2m_min.map((c) => formatTempNumber(c, units.temperature));
  const allMaxs = daily.temperature_2m_max.map((c) => formatTempNumber(c, units.temperature));
  const weekMin = Math.min(...allMins);
  const weekMax = Math.max(...allMaxs);
  const weekRange = weekMax - weekMin || 1;

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div
      id="daily-synoptic-forecast"
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-sky-500" />
            7-Day Synoptic Outlook
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-day meteorological forecast models and precipitation probability
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
        {daily.time.map((timeStr, idx) => {
          const code = daily.weather_code[idx] || 0;
          const condition = getWeatherCondition(code);
          const tMax = daily.temperature_2m_max[idx];
          const tMin = daily.temperature_2m_min[idx];
          const precipSum = daily.precipitation_sum[idx];
          const precipProb = daily.precipitation_probability_max?.[idx] ?? 0;
          const windMax = daily.wind_speed_10m_max?.[idx];
          const windDir = daily.wind_direction_10m_dominant?.[idx] ?? 0;
          const uvMax = daily.uv_index_max?.[idx];
          const sunrise = daily.sunrise?.[idx];
          const sunset = daily.sunset?.[idx];

          const isExpanded = expandedIndex === idx;

          // Normalized bar calculation
          const minNum = formatTempNumber(tMin, units.temperature);
          const maxNum = formatTempNumber(tMax, units.temperature);
          const leftPercent = ((minNum - weekMin) / weekRange) * 100;
          const widthPercent = Math.max(12, ((maxNum - minNum) / weekRange) * 100);

          const isToday = idx === 0;

          return (
            <div key={`daily-row-${timeStr}`} className="py-2.5 transition">
              <div
                onClick={() => toggleExpand(idx)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
              >
                {/* Day label and condition */}
                <div className="flex items-center gap-3 min-w-[170px]">
                  <div className="w-20">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {isToday ? 'Today' : formatISODate(timeStr).split(',')[0]}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {timeStr.slice(5)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {condition.label}
                    </span>
                    {precipProb > 15 && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium">
                        <CloudRain className="h-3 w-3" /> {precipProb}% ({formatPrecip(precipSum, units.precipitation)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Analytical Temperature Spread Range Bar */}
                <div className="flex-1 flex items-center gap-3 max-w-sm">
                  <span className="w-10 text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                    {formatTemp(tMin, units.temperature)}
                  </span>

                  {/* Horizontal Bar Track */}
                  <div className="relative flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 to-amber-500"
                      style={{
                        left: `${Math.max(0, leftPercent)}%`,
                        width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                      }}
                    />
                  </div>

                  <span className="w-10 text-left text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                    {formatTemp(tMax, units.temperature)}
                  </span>
                </div>

                {/* Wind & Accordion Chevron */}
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 min-w-[120px]">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Wind className="h-3.5 w-3.5 text-slate-400" />
                    {formatSpeed(windMax, units.speed)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Diagnostic Details */}
              {isExpanded && (
                <div className="mt-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <Sunrise className="h-3.5 w-3.5 text-amber-500" /> Sunrise
                      </span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {sunrise ? formatISOTime(sunrise) : '--'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <Sunset className="h-3.5 w-3.5 text-orange-500" /> Sunset
                      </span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {sunset ? formatISOTime(sunset) : '--'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <Sun className="h-3.5 w-3.5 text-amber-500" /> Max UV Index
                      </span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {uvMax !== undefined ? uvMax.toFixed(1) : '--'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                        <Wind className="h-3.5 w-3.5 text-sky-500" /> Dominant Wind
                      </span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {getWindDirectionCardinal(windDir)} ({windDir}°)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
