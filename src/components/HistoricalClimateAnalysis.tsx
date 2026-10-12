import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Thermometer,
  CloudRain,
  Wind,
  Layers,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { GeoLocation, HistoricalClimateData, UnitPreferences } from '../types/weather';
import { fetchHistoricalClimate } from '../services/openMeteo';
import {
  formatTemp,
  formatTempNumber,
  formatPrecip,
  formatSpeed,
} from '../utils/weatherMath';

interface HistoricalClimateAnalysisProps {
  location: GeoLocation;
  units: UnitPreferences;
}

interface TempChartPoint {
  x: number;
  yMean: number;
  yMax: number;
  yMin: number;
  meanVal: number;
  maxVal: number;
  minVal: number;
  date: string;
}

interface ScalarChartPoint {
  x: number;
  y: number;
  val: number;
  date: string;
}

type ChartDataState =
  | {
      type: 'temperature';
      points: TempChartPoint[];
      min: number;
      max: number;
      unit: string;
    }
  | {
      type: 'precipitation' | 'wind';
      points: ScalarChartPoint[];
      min: number;
      max: number;
      unit: string;
    };

export const HistoricalClimateAnalysis: React.FC<HistoricalClimateAnalysisProps> = ({
  location,
  units,
}) => {
  const [daysRange, setDaysRange] = useState<7 | 30 | 90 | 365>(30);
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'precipitation' | 'wind'>('temperature');
  const [climateData, setClimateData] = useState<HistoricalClimateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchHistoricalClimate(location, daysRange)
      .then((data) => {
        if (!isCancelled) {
          setClimateData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Historical climate fetch failed:', err);
          setError('Unable to load historical archive from Open-Meteo API.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [location.latitude, location.longitude, daysRange]);

  // Chart coordinate calculations
  const width = 850;
  const height = 220;
  const paddingX = 30;
  const paddingTop = 25;
  const paddingBottom = 32;

  const chartData: ChartDataState | null = useMemo(() => {
    if (!climateData || climateData.time.length === 0) return null;

    const len = climateData.time.length;
    const chartHeight = height - paddingTop - paddingBottom;
    const stepX = (width - paddingX * 2) / Math.max(1, len - 1);

    if (activeMetric === 'temperature') {
      const means = climateData.temperature_2m_mean.map((c) => formatTempNumber(c, units.temperature));
      const maxs = climateData.temperature_2m_max.map((c) => formatTempNumber(c, units.temperature));
      const mins = climateData.temperature_2m_min.map((c) => formatTempNumber(c, units.temperature));

      const globalMin = Math.min(...mins.filter((v) => !isNaN(v)));
      const globalMax = Math.max(...maxs.filter((v) => !isNaN(v)));
      const range = globalMax - globalMin || 1;

      const points: TempChartPoint[] = climateData.time.map((dateStr, i) => {
        const x = paddingX + i * stepX;
        const normMean = (means[i] - globalMin) / range;
        const normMax = (maxs[i] - globalMin) / range;
        const normMin = (mins[i] - globalMin) / range;

        return {
          x,
          yMean: height - paddingBottom - normMean * chartHeight,
          yMax: height - paddingBottom - normMax * chartHeight,
          yMin: height - paddingBottom - normMin * chartHeight,
          meanVal: means[i],
          maxVal: maxs[i],
          minVal: mins[i],
          date: dateStr,
        };
      });

      return {
        type: 'temperature' as const,
        points,
        min: globalMin,
        max: globalMax,
        unit: `°${units.temperature === 'celsius' ? 'C' : 'F'}`,
      };
    } else if (activeMetric === 'precipitation') {
      const precips = climateData.precipitation_sum.map((mm) => (mm !== null && !isNaN(mm) ? mm : 0));
      const maxP = Math.max(5, ...precips);

      const points: ScalarChartPoint[] = climateData.time.map((dateStr, i) => {
        const x = paddingX + i * stepX;
        const norm = precips[i] / maxP;
        const y = height - paddingBottom - norm * chartHeight;
        return {
          x,
          y,
          val: precips[i],
          date: dateStr,
        };
      });

      return {
        type: 'precipitation' as const,
        points,
        min: 0,
        max: maxP,
        unit: units.precipitation,
      };
    } else {
      // Wind
      const winds = climateData.wind_speed_10m_max.map((kmh) => {
        if (units.speed === 'mph') return Math.round(kmh * 0.621371);
        if (units.speed === 'ms') return Number((kmh / 3.6).toFixed(1));
        return Math.round(kmh);
      });
      const minW = 0;
      const maxW = Math.max(20, ...winds);
      const range = maxW - minW || 1;

      const points: ScalarChartPoint[] = climateData.time.map((dateStr, i) => {
        const x = paddingX + i * stepX;
        const norm = (winds[i] - minW) / range;
        const y = height - paddingBottom - norm * chartHeight;
        return {
          x,
          y,
          val: winds[i],
          date: dateStr,
        };
      });

      return {
        type: 'wind' as const,
        points,
        min: minW,
        max: maxW,
        unit: units.speed,
      };
    }
  }, [climateData, activeMetric, units, width, height]);

  // Construct Temperature Envelope Path (Between Daily Min and Daily Max)
  const tempEnvelopePath = useMemo(() => {
    if (!chartData || chartData.type !== 'temperature') return '';
    const pts = chartData.points;
    if (pts.length === 0) return '';

    // Upper curve (max temperatures)
    let d = `M ${pts[0].x} ${pts[0].yMax}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].yMax}`;
    }
    // Lower curve in reverse (min temperatures)
    for (let i = pts.length - 1; i >= 0; i--) {
      d += ` L ${pts[i].x} ${pts[i].yMin}`;
    }
    d += ' Z';
    return d;
  }, [chartData]);

  // Construct Mean Line Path
  const meanLinePath = useMemo(() => {
    if (!chartData) return '';

    if (chartData.type === 'temperature') {
      const pts = chartData.points;
      if (pts.length === 0) return '';
      let d = `M ${pts[0].x} ${pts[0].yMean}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x} ${pts[i].yMean}`;
      }
      return d;
    } else {
      const pts = chartData.points;
      if (pts.length === 0) return '';
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x} ${pts[i].y}`;
      }
      return d;
    }
  }, [chartData]);

  const activeHover = hoverIndex !== null && chartData?.points[hoverIndex] ? chartData.points[hoverIndex] : null;

  return (
    <div
      id="historical-climate-analysis-module"
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
    >
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Climate & Historical Trends
            </h3>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Open-Meteo Archive
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Long-term climate verification, baseline thermal deviations, and accumulation analysis
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto">
          {([7, 30, 90, 365] as const).map((r) => (
            <button
              key={`range-${r}`}
              onClick={() => setDaysRange(r)}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                daysRange === r
                  ? 'bg-slate-900 text-white dark:bg-sky-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {r === 365 ? '1 Year' : `${r} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Mode Tabs */}
      <div className="flex items-center gap-2 pt-3">
        <button
          onClick={() => setActiveMetric('temperature')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            activeMetric === 'temperature'
              ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Thermometer className="h-3.5 w-3.5 text-amber-500" />
          <span>Thermal Envelope & Mean</span>
        </button>

        <button
          onClick={() => setActiveMetric('precipitation')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            activeMetric === 'precipitation'
              ? 'bg-blue-500/15 text-blue-800 border border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <CloudRain className="h-3.5 w-3.5 text-blue-500" />
          <span>Precipitation Sums</span>
        </button>

        <button
          onClick={() => setActiveMetric('wind')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            activeMetric === 'wind'
              ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
          }`}
        >
          <Wind className="h-3.5 w-3.5 text-emerald-500" />
          <span>Peak Wind Velocity</span>
        </button>
      </div>

      {/* Climate Anomaly Statistical Summary Cards */}
      {climateData && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Period Mean Temp
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {formatTemp(climateData.baselineTempMean, units.temperature)}
            </div>
            <span className="text-[10px] text-slate-500">
              Baseline equilibrium
            </span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Absolute High / Low
            </span>
            <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="text-rose-500">{formatTemp(climateData.maxRecordedTemp, units.temperature)}</span>
              <span className="text-slate-300">/</span>
              <span className="text-sky-500">{formatTemp(climateData.minRecordedTemp, units.temperature)}</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Total thermal spread
            </span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Precipitation Volume
            </span>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatPrecip(climateData.totalPrecipitation, units.precipitation)}
            </div>
            <span className="text-[10px] text-slate-500">
              Accumulated rainfall
            </span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Thermal Trend Slope
            </span>
            <div
              className={`text-lg font-bold ${
                climateData.tempAnomalyTrend > 0.5
                  ? 'text-rose-500'
                  : climateData.tempAnomalyTrend < -0.5
                  ? 'text-sky-500'
                  : 'text-emerald-500'
              }`}
            >
              {climateData.tempAnomalyTrend > 0 ? '+' : ''}
              {climateData.tempAnomalyTrend.toFixed(1)}°C
            </div>
            <span className="text-[10px] text-slate-500">
              {climateData.tempAnomalyTrend > 0.5 ? 'Warming trend' : climateData.tempAnomalyTrend < -0.5 ? 'Cooling trend' : 'Stable envelope'}
            </span>
          </div>
        </div>
      )}

      {/* Main Interactive Climate Chart */}
      <div className="relative mt-2">
        {isLoading ? (
          <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            <span className="text-xs text-slate-500">Loading historical climate telemetry...</span>
          </div>
        ) : error ? (
          <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 text-rose-500 text-xs">
            <AlertCircle className="h-6 w-6" />
            <span>{error}</span>
          </div>
        ) : chartData ? (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 overflow-visible"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="climateTempGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id="precipHistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
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
                y1={height - paddingBottom}
                x2={width - paddingX}
                y2={height - paddingBottom}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
              />

              {/* Min & Max Labels */}
              <text
                x={paddingX}
                y={paddingTop - 6}
                className="text-[10px] font-mono fill-slate-400 font-bold"
              >
                Max: {chartData.max} {chartData.unit}
              </text>
              <text
                x={paddingX}
                y={height - paddingBottom + 16}
                className="text-[10px] font-mono fill-slate-400 font-bold"
              >
                Min: {chartData.min} {chartData.unit}
              </text>

              {/* Temperature Min-Max Envelope Shading */}
              {chartData.type === 'temperature' && (
                <path d={tempEnvelopePath} fill="url(#climateTempGrad)" />
              )}

              {/* Precipitation Area Shading */}
              {chartData.type === 'precipitation' && (
                <path
                  d={`${meanLinePath} L ${width - paddingX} ${height - paddingBottom} L ${paddingX} ${
                    height - paddingBottom
                  } Z`}
                  fill="url(#precipHistGrad)"
                />
              )}

              {/* Main Line Stroke */}
              <path
                d={meanLinePath}
                fill="none"
                stroke={
                  chartData.type === 'temperature'
                    ? '#f59e0b'
                    : chartData.type === 'precipitation'
                    ? '#3b82f6'
                    : '#10b981'
                }
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Point Dots & Invisible Triggers */}
              {chartData.points.map((p, idx) => {
                const isHovered = hoverIndex === idx;
                const showTick = idx % Math.ceil(chartData.points.length / 7) === 0;

                return (
                  <g key={`hist-pt-${idx}`}>
                    {/* Date label tick */}
                    {showTick && (
                      <text
                        x={p.x}
                        y={height - 6}
                        textAnchor="middle"
                        className="text-[9px] font-mono fill-slate-400"
                      >
                        {p.date.slice(5)}
                      </text>
                    )}

                    {/* Circle dot */}
                    {isHovered && (
                      <circle
                        cx={p.x}
                        cy={'yMean' in p ? p.yMean : p.y}
                        r={5}
                        fill="#ffffff"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                      />
                    )}

                    {/* Rect trigger */}
                    <rect
                      x={p.x - 10}
                      y={0}
                      width={20}
                      height={height}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverIndex(idx)}
                    />
                  </g>
                );
              })}

              {/* Active Hover Crosshair Line */}
              {activeHover && (
                <line
                  x1={activeHover.x}
                  y1={paddingTop}
                  x2={activeHover.x}
                  y2={height - paddingBottom}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}
            </svg>

            {/* Hover Tooltip Box */}
            {activeHover && hoverIndex !== null && (
              <div
                className="pointer-events-none absolute -top-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-xl backdrop-blur-xs dark:border-slate-700 dark:bg-slate-800/95 transition-all text-xs"
                style={{
                  left: `${(activeHover.x / width) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-bold text-slate-900 dark:text-white font-mono">
                  {activeHover.date}
                </div>
                {'meanVal' in activeHover ? (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Mean: <strong>{activeHover.meanVal}°</strong> • Max: {activeHover.maxVal}° • Min:{' '}
                    {activeHover.minVal}°
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Value: <strong>{activeHover.val} {chartData.unit}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
