/**
 * Open-Meteo API Client with Offline Fallback & Bandwidth Optimization
 */

import {
  GeoLocation,
  WeatherPayload,
  HistoricalClimateData,
  AirQualityData,
} from '../types/weather';
import {
  saveWeatherToCache,
  getWeatherFromCache,
  saveHistoricalToCache,
  getHistoricalFromCache,
} from './storage';

export interface WeatherCodeInfo {
  code: number;
  label: string;
  description: string;
  iconName: string; // lucide icon identifier
  category: 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';
}

export const WMO_WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { code: 0, label: 'Clear Sky', description: 'Cloudless atmospheric conditions', iconName: 'Sun', category: 'clear' },
  1: { code: 1, label: 'Mainly Clear', description: 'Scattered thin clouds', iconName: 'SunMedium', category: 'clear' },
  2: { code: 2, label: 'Partly Cloudy', description: 'Scattered cumulus clouds', iconName: 'CloudSun', category: 'cloudy' },
  3: { code: 3, label: 'Overcast', description: 'Dense uniform cloud deck', iconName: 'Cloud', category: 'cloudy' },
  45: { code: 45, label: 'Fog', description: 'Surface condensation limiting visibility', iconName: 'CloudFog', category: 'fog' },
  48: { code: 48, label: 'Depositing Rime Fog', description: 'Freezing fog with ice crystal deposition', iconName: 'CloudFog', category: 'fog' },
  51: { code: 51, label: 'Light Drizzle', description: 'Fine water droplet mist', iconName: 'CloudDrizzle', category: 'drizzle' },
  53: { code: 53, label: 'Moderate Drizzle', description: 'Steady fine precipitation', iconName: 'CloudDrizzle', category: 'drizzle' },
  55: { code: 55, label: 'Dense Drizzle', description: 'Intense fine precipitation', iconName: 'CloudDrizzle', category: 'drizzle' },
  56: { code: 56, label: 'Light Freezing Drizzle', description: 'Freezing drizzle forming glaze', iconName: 'CloudSnow', category: 'snow' },
  57: { code: 57, label: 'Dense Freezing Drizzle', description: 'Hazardous glaze formation', iconName: 'CloudSnow', category: 'snow' },
  61: { code: 61, label: 'Slight Rain', description: 'Light continuous rainfall', iconName: 'CloudRain', category: 'rain' },
  63: { code: 63, label: 'Moderate Rain', description: 'Standard rainfall rate', iconName: 'CloudRain', category: 'rain' },
  65: { code: 65, label: 'Heavy Rain', description: 'Torrential downpour and runoff risk', iconName: 'CloudRainWind', category: 'rain' },
  66: { code: 66, label: 'Light Freezing Rain', description: 'Rain freezing upon contact', iconName: 'CloudSnow', category: 'snow' },
  67: { code: 67, label: 'Heavy Freezing Rain', description: 'Severe black ice danger', iconName: 'CloudSnow', category: 'snow' },
  71: { code: 71, label: 'Slight Snow Fall', description: 'Light accumulation of snow', iconName: 'Snowflake', category: 'snow' },
  73: { code: 73, label: 'Moderate Snow Fall', description: 'Steady accumulating snowfall', iconName: 'Snowflake', category: 'snow' },
  75: { code: 75, label: 'Heavy Snow Fall', description: 'Heavy blizzard-like accumulation', iconName: 'Snowflake', category: 'snow' },
  77: { code: 77, label: 'Snow Grains', description: 'Opaque frozen grains', iconName: 'Snowflake', category: 'snow' },
  80: { code: 80, label: 'Slight Rain Showers', description: 'Brief convective rainfall', iconName: 'CloudSunRain', category: 'rain' },
  81: { code: 81, label: 'Moderate Rain Showers', description: 'Passing convective showers', iconName: 'CloudSunRain', category: 'rain' },
  82: { code: 82, label: 'Violent Rain Showers', description: 'Extreme sudden convective deluge', iconName: 'CloudRainWind', category: 'rain' },
  85: { code: 85, label: 'Slight Snow Showers', description: 'Intermittent snow flurries', iconName: 'CloudSnow', category: 'snow' },
  86: { code: 86, label: 'Heavy Snow Showers', description: 'Intense convective snow bursts', iconName: 'CloudSnow', category: 'snow' },
  95: { code: 95, label: 'Thunderstorm', description: 'Electric convective storm with lightning', iconName: 'CloudLightning', category: 'thunderstorm' },
  96: { code: 96, label: 'Thunderstorm with Slight Hail', description: 'Severe convective storm with small hail', iconName: 'CloudLightning', category: 'thunderstorm' },
  99: { code: 99, label: 'Thunderstorm with Heavy Hail', description: 'Violent supercell storm with damaging hail', iconName: 'CloudLightning', category: 'thunderstorm' },
};

export function getWeatherCondition(code: number): WeatherCodeInfo {
  return (
    WMO_WEATHER_CODES[code] || {
      code,
      label: 'Atmospheric Disturbance',
      description: 'Variable cloud and pressure conditions',
      iconName: 'Cloud',
      category: 'cloudy',
    }
  );
}

/**
 * Fetch Live Weather with Open-Meteo
 */
export async function fetchLiveWeather(
  location: GeoLocation,
  options?: { lowBandwidth?: boolean; forceNetwork?: boolean }
): Promise<WeatherPayload> {
  const { latitude, longitude } = location;
  const isLowBandwidth = options?.lowBandwidth ?? false;

  // Forecast days: 3 for low-bandwidth mode to save ~60% data transfer, otherwise 7
  const forecastDays = isLowBandwidth ? 4 : 7;

  const currentParams = [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'is_day',
    'precipitation',
    'rain',
    'showers',
    'snowfall',
    'weather_code',
    'cloud_cover',
    'pressure_msl',
    'surface_pressure',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'uv_index',
    'visibility',
    'dew_point_2m',
  ].join(',');

  const hourlyParams = [
    'temperature_2m',
    'relative_humidity_2m',
    'dew_point_2m',
    'apparent_temperature',
    'precipitation_probability',
    'precipitation',
    'weather_code',
    'pressure_msl',
    'surface_pressure',
    'cloud_cover',
    'visibility',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'uv_index',
  ].join(',');

  const dailyParams = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'apparent_temperature_max',
    'apparent_temperature_min',
    'sunrise',
    'sunset',
    'uv_index_max',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'wind_direction_10m_dominant',
  ].join(',');

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentParams}&hourly=${hourlyParams}&daily=${dailyParams}&timezone=auto&forecast_days=${forecastDays}`;

  try {
    const weatherPromise = fetch(weatherUrl).then(async (res) => {
      if (!res.ok) throw new Error(`Weather API returned status ${res.status}`);
      return res.json();
    });

    // Fetch air quality in parallel (only if not restricted or skip on low-bandwidth)
    let airQualityPromise: Promise<any> | null = null;
    if (!isLowBandwidth) {
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,us_aqi,european_aqi&timezone=auto&forecast_days=3`;
      airQualityPromise = fetch(aqiUrl)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
    }

    const [weatherData, aqiData] = await Promise.all([weatherPromise, airQualityPromise]);

    const payload: WeatherPayload = {
      latitude: weatherData.latitude,
      longitude: weatherData.longitude,
      generationtime_ms: weatherData.generationtime_ms,
      utc_offset_seconds: weatherData.utc_offset_seconds,
      timezone: weatherData.timezone,
      elevation: weatherData.elevation,
      current: weatherData.current,
      hourly: weatherData.hourly,
      daily: weatherData.daily,
      airQuality: aqiData ? formatAirQuality(aqiData) : undefined,
      location,
      fetchedAt: Date.now(),
      isCached: false,
    };

    // Cache persistently for offline availability
    saveWeatherToCache(payload).catch((e) => console.warn('Cache write failed:', e));

    return payload;
  } catch (error) {
    console.warn('Network request failed. Attempting offline cache fallback...', error);
    const cached = await getWeatherFromCache(latitude, longitude);
    if (cached) {
      return cached;
    }
    throw new Error('Unable to retrieve weather data and no offline cache is available.');
  }
}

function formatAirQuality(raw: any): AirQualityData {
  return {
    time: raw.hourly?.time || [],
    pm10: raw.hourly?.pm10,
    pm2_5: raw.hourly?.pm2_5,
    carbon_monoxide: raw.hourly?.carbon_monoxide,
    nitrogen_dioxide: raw.hourly?.nitrogen_dioxide,
    sulphur_dioxide: raw.hourly?.sulphur_dioxide,
    ozone: raw.hourly?.ozone,
    european_aqi: raw.hourly?.european_aqi,
    us_aqi: raw.hourly?.us_aqi,
    current: raw.current
      ? {
          pm2_5: raw.current.pm2_5,
          pm10: raw.current.pm10,
          ozone: raw.current.ozone,
          nitrogen_dioxide: raw.current.nitrogen_dioxide,
          us_aqi: raw.current.us_aqi,
          european_aqi: raw.current.european_aqi,
        }
      : undefined,
  };
}

/**
 * Search locations via Open-Meteo Geocoding
 */
export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=10&language=en&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding search failed');
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      elevation: item.elevation,
      country: item.country,
      country_code: item.country_code,
      admin1: item.admin1,
      timezone: item.timezone,
    }));
  } catch (e) {
    console.warn('Geocoding error:', e);
    return [];
  }
}

/**
 * Fetch Historical Weather / Climate Trends
 * Queries Open-Meteo Archive API
 */
export async function fetchHistoricalClimate(
  location: GeoLocation,
  daysRange: 7 | 30 | 90 | 365 = 30
): Promise<HistoricalClimateData> {
  const cacheKey = `climate_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}_${daysRange}`;
  const cached = await getHistoricalFromCache(cacheKey);
  if (cached) return cached;

  const now = new Date();
  // The archive API has data up to ~2-5 days ago. For recent dates, we compute end date as 3 days ago.
  const end = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - daysRange * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const startDateStr = formatDate(start);
  const endDateStr = formatDate(end);

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Archive API responded with ${res.status}`);
    const data = await res.json();

    const daily = data.daily;
    const time: string[] = daily.time || [];
    const tempMeans: number[] = daily.temperature_2m_mean || [];
    const tempMaxs: number[] = daily.temperature_2m_max || [];
    const tempMins: number[] = daily.temperature_2m_min || [];
    const precipSums: number[] = daily.precipitation_sum || [];
    const windMaxs: number[] = daily.wind_speed_10m_max || [];

    const validMeans = tempMeans.filter((t) => t !== null && !isNaN(t));
    const baselineTempMean = validMeans.length ? validMeans.reduce((a, b) => a + b, 0) / validMeans.length : 0;
    const totalPrecipitation = precipSums.reduce((a, b) => a + (b || 0), 0);
    const maxRecordedTemp = Math.max(...tempMaxs.filter((t) => t !== null));
    const minRecordedTemp = Math.min(...tempMins.filter((t) => t !== null));

    // Calculate trend slope / anomaly (difference between second half and first half)
    const mid = Math.floor(validMeans.length / 2);
    const firstHalfMean = validMeans.slice(0, mid).reduce((a, b) => a + b, 0) / (mid || 1);
    const secondHalfMean = validMeans.slice(mid).reduce((a, b) => a + b, 0) / (validMeans.length - mid || 1);
    const tempAnomalyTrend = secondHalfMean - firstHalfMean;

    const result: HistoricalClimateData = {
      time,
      temperature_2m_mean: tempMeans,
      temperature_2m_max: tempMaxs,
      temperature_2m_min: tempMins,
      precipitation_sum: precipSums,
      wind_speed_10m_max: windMaxs,
      startDate: startDateStr,
      endDate: endDateStr,
      baselineTempMean,
      totalPrecipitation,
      maxRecordedTemp,
      minRecordedTemp,
      tempAnomalyTrend,
    };

    saveHistoricalToCache(cacheKey, result).catch(() => {});
    return result;
  } catch (error) {
    console.warn('Historical archive fetch failed:', error);
    throw error;
  }
}
