import React, { useState, useMemo } from 'react';
import {
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Droplets,
  Sun,
  Eye,
  Calendar,
} from 'lucide-react';
import { HourlyForecast, UnitPreferences } from '../types/weather';
import { getWeatherCondition } from '../services/openMeteo';
import {
  formatTempNumber,
  formatSpeed,
  formatPressure,
  formatISOTime,
} from '../utils/weatherMath';

interface HourlyTimelineChartProps {
  hourly: HourlyForecast;
  units: UnitPreferences;
}

type MetricType = 'temp' | 'precip' | 'wind' | 'pressure' | 'humidity' | 'clouds';

export const HourlyTimelineChart: React.FC<HourlyTimelineChartProps> = ({ hourly, units }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('temp');
  const [timeSpanHours, setTimeSpanHours] = useState<24 | 48>(24);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Slice dataset to active time span
  const times = useMemo(() => hourly.time.slice(0, timeSpanHours), [hourly.time, timeSpanHours]);

  const metricConfig = useMemo(() => {
    switch (selectedMetric) {
      case 'temp': {
        const rawTemps = hourly.temperature_2m.slice(0, timeSpanHours);
        const data = rawTemps.map((c) => formatTempNumber(c, units.temperature));
        const min = Math.min(...data);
        const max = Math.max(...data);
        return {
          label: `Temperature (°${units.temperature === 'celsius' ? 'C' : 'F'})`,
          unit: `°${units.temperature === 'celsius' ? 'C' : 'F'}`,
          data,
          min: Math.floor(min - 2),
          max: Math.ceil(max + 2),
          color: '#38bdf8', // sky
          gradientId: 'tempGrad',
          stroke: '#0284c7',
        };
      }
      case 'precip': {
        const probs = hourly.precipitation_probability.slice(0, timeSpanHours);
        return {
          label: 'Precipitation Probability (%)',
          unit: '%',
          data: probs,
          min: 0,
          max: 100,
          color: '#3b82f6',
          gradientId: 'precipGrad',
          stroke: '#2563eb',
        };
      }
      case 'wind': {
        const speeds = hourly.wind_speed_10m.slice(0, timeSpanHours).map((kmh) => {
          if (units.speed === 'mph') return Math.round(kmh * 0.621371);
          if (units.speed === 'ms') return Number((kmh / 3.6).toFixed(1));
          return Math.round(kmh);
        });
        const min = Math.min(...speeds);
        const max = Math.max(...speeds);
        return {
          label: `Wind Velocity (${units.speed})`,
          unit: units.speed,
          data: speeds,
          min: Math.max(0, Math.floor(min - 2)),
          max: Math.ceil(max + 4),
          color: '#10b981', // emerald
          gradientId: 'windGrad',
          stroke: '#059669',
        };
      }
      case 'pressure': {
        const pressures = hourly.pressure_msl.slice(0, timeSpanHours).map((p) => {
          if (units.pressure === 'inHg') return Number((p * 0.02953).toFixed(2));
          return Math.round(p);
        });
        const min = Math.min(...pressures);
        const max = Math.max(...pressures);
        return {
          label: `Barometric Pressure (${units.pressure})`,
          unit: units.pressure,
          data: pressures,
          min: units.pressure === 'inHg' ? Number((min - 0.1).toFixed(2)) : Math.floor(min - 3),
          max: units.pressure === 'inHg' ? Number((max + 0.1).toFixed(2)) : Math.ceil(max + 3),
          color: '#8b5cf6', // purple
          gradientId: 'pressureGrad',
          stroke: '#7c3aed',
        };
      }
      case 'humidity': {
        const hum = hourly.relative_humidity_2m.slice(0, timeSpanHours);
        return {
          label: 'Relative Humidity (%)',
          unit: '%',
          data: hum,
          min: 0,
          max: 100,
          color: '#06b6d4', // cyan
          gradientId: 'humidityGrad',
          stroke: '#0891b2',
        };
      }
      case 'clouds': {
        const clouds = hourly.cloud_cover.slice(0, timeSpanHours);
        return {
          label: 'Cloud Cover (%)',
          unit: '%',
          data: clouds,
          min: 0,
          max: 100,
          color: '#64748b', // slate
          gradientId: 'cloudGrad',
          stroke: '#475569',
        };
      }
    }
  }, [selectedMetric, timeSpanHours, hourly, units]);

  // Construct SVG Path
  const width = 800;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;

  const points = useMemo(() => {
    const data = metricConfig.data;
    const len = data.length;
    const yRange = metricConfig.max - metricConfig.min || 1;
    const chartHeight = height - paddingTop - paddingBottom;
    const stepX = (width - paddingX * 2) / (len - 1);

    return data.map((val, i) => {
      const x = paddingX + i * stepX;
      const normalizedY = (val - metricConfig.min) / yRange;
      const y = height - paddingBottom - normalizedY * chartHeight;
      return { x, y, val, time: times[i] };
    });
  }, [metricConfig, times, width, height]);

  // Smooth bezier curve generator
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = height - paddingBottom;
    return `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [pathD, points, height, paddingBottom]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div
      id="hourly-atmospheric-timeline"
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
    >
      {/* Header with Metric Tabs & Time Span Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-500" />
            Hourly Atmospheric Timeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive synoptic telemetry curve with crosshair inspection
          </p>
        </div>

        {/* Span Filter (24h vs 48h) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setTimeSpanHours(24)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              timeSpanHours === 24
                ? 'bg-slate-900 text-white dark:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            24 Hours
          </button>
          <button
            onClick={() => setTimeSpanHours(48)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              timeSpanHours === 48
                ? 'bg-slate-900 text-white dark:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            48 Hours
          </button>
        </div>
      </div>

      {/* Metric Switcher Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-3">
        <button
          onClick={() => setSelectedMetric('temp')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
            selectedMetric === 'temp'
              ? 'bg-sky-500/15 text-sky-700 border border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Thermometer className="h-3.5 w-3.5 text-sky-500" />
          <span>Thermal Profile</span>
        </button>

        <button
          onClick={() => setSelectedMetric('precip')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
            selectedMetric === 'precip'
              ? 'bg-blue-500/15 text-blue-700 border border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <CloudRain className="h-3.5 w-3.5 text-blue-500" />
          <span>Precipitation %</span>
        </button>

        <button
          onClick={() => setSelectedMetric('wind')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
            selectedMetric === 'wind'
              ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Wind className="h-3.5 w-3.5 text-emerald-500" />
          <span>Wind Speed</span>
        </button>

        <button
          onClick={() => setSelectedMetric('pressure')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
            selectedMetric === 'pressure'
              ? 'bg-purple-500/15 text-purple-700 border border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Gauge className="h-3.5 w-3.5 text-purple-500" />
          <span>Atmospheric Pressure</span>
        </button>

        <button
          onClick={() => setSelectedMetric('humidity')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
            selectedMetric === 'humidity'
              ? 'bg-cyan-500/15 text-cyan-700 border border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Droplets className="h-3.5 w-3.5 text-cyan-500" />
          <span>Humidity</span>
        </button>

        <button
          onClick={() => setSelectedMetric('clouds')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
            selectedMetric === 'clouds'
              ? 'bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-700 dark:text-slate-200'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Eye className="h-3.5 w-3.5 text-slate-400" />
          <span>Cloud Cover</span>
        </button>
      </div>

      {/* Interactive SVG Chart Stage */}
      <div className="relative mt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={metricConfig.gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={metricConfig.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={metricConfig.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={width - paddingX}
            y2={paddingTop}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-slate-200 dark:text-slate-800"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-slate-200 dark:text-slate-800"
          />
          <line
            x1={paddingX}
            y1={height - paddingBottom}
            x2={width - paddingX}
            y2={height - paddingBottom}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Max and Min Value Labels */}
          <text
            x={paddingX}
            y={paddingTop - 6}
            className="text-[10px] font-mono fill-slate-400 font-semibold"
          >
            {metricConfig.max} {metricConfig.unit}
          </text>
          <text
            x={paddingX}
            y={height - paddingBottom + 16}
            className="text-[10px] font-mono fill-slate-400 font-semibold"
          >
            {metricConfig.min} {metricConfig.unit}
          </text>

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${metricConfig.gradientId})`} />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={metricConfig.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points with Hit Boxes */}
          {points.map((p, idx) => {
            const isHovered = hoverIndex === idx;
            // Display hour label every 4 points
            const showHourLabel = idx % (timeSpanHours === 48 ? 6 : 3) === 0;

            return (
              <g key={`point-${idx}`}>
                {/* Time Tick Label */}
                {showHourLabel && (
                  <text
                    x={p.x}
                    y={height - 6}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                  >
                    {formatISOTime(p.time)}
                  </text>
                )}

                {/* Point dot */}
                {(isHovered || showHourLabel) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 3}
                    fill={isHovered ? '#ffffff' : metricConfig.color}
                    stroke={metricConfig.stroke}
                    strokeWidth={isHovered ? 3 : 1.5}
                    className="transition-all"
                  />
                )}

                {/* Invisible hover capture rectangle */}
                <rect
                  x={p.x - 12}
                  y={0}
                  width={24}
                  height={height}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              </g>
            );
          })}

          {/* Active Crosshair Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={height - paddingBottom}
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {/* Dynamic Hover Tooltip Card */}
        {activePoint && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute -top-8 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-xs dark:border-slate-700 dark:bg-slate-800/95 transition-all text-xs"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-slate-900 dark:text-white">
                {activePoint.val} {metricConfig.unit}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatISOTime(activePoint.time)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {getWeatherCondition(hourly.weather_code[hoverIndex] || 0).label}
            </div>
          </div>
        )}
      </div>

      {/* Scrubbing Hourly Weather Strip below the graph */}
      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
        {points.map((p, idx) => {
          const code = hourly.weather_code[idx] || 0;
          const cond = getWeatherCondition(code);
          const isSelected = hoverIndex === idx;

          return (
            <div
              key={`strip-${idx}`}
              onMouseEnter={() => setHoverIndex(idx)}
              className={`flex flex-col items-center justify-between rounded-2xl p-2.5 min-w-[72px] transition cursor-pointer border ${
                isSelected
                  ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/10'
                  : 'border-transparent bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {formatISOTime(p.time)}
              </span>

              <div className="my-1.5 font-bold text-xs text-slate-900 dark:text-white">
                {p.val}
                <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                  {metricConfig.unit}
                </span>
              </div>

              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[60px]">
                {cond.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
