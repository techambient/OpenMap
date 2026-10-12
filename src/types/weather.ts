/**
 * Weather & Atmospheric Analytics Types
 */

export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  uv_index: number;
  visibility: number;
  dew_point_2m: number;
}

export interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  dew_point_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  pressure_msl: number[];
  surface_pressure: number[];
  cloud_cover: number[];
  visibility: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_gusts_10m: number[];
  uv_index: number[];
}

export interface DailyForecast {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
  wind_direction_10m_dominant: number[];
}

export interface AirQualityData {
  time: string[];
  pm10?: number[];
  pm2_5?: number[];
  carbon_monoxide?: number[];
  nitrogen_dioxide?: number[];
  sulphur_dioxide?: number[];
  ozone?: number[];
  european_aqi?: number[];
  us_aqi?: number[];
  current?: {
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
    us_aqi?: number;
    european_aqi?: number;
  };
}

export interface WeatherPayload {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  elevation: number;
  current: CurrentWeather;
  hourly: HourlyForecast;
  daily: DailyForecast;
  airQuality?: AirQualityData;
  location: GeoLocation;
  fetchedAt: number;
  isCached?: boolean;
}

export interface HistoricalClimateData {
  time: string[];
  temperature_2m_mean: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  startDate: string;
  endDate: string;
  baselineTempMean: number;
  totalPrecipitation: number;
  maxRecordedTemp: number;
  minRecordedTemp: number;
  tempAnomalyTrend: number; // positive or negative deviation
}

export type SeverityLevel = 'advisory' | 'watch' | 'warning' | 'extreme';

export interface SevereWeatherAlert {
  id: string;
  severity: SeverityLevel;
  title: string;
  category: 'wind' | 'precipitation' | 'temperature' | 'thunderstorm' | 'pressure' | 'air_quality' | 'uv';
  description: string;
  parameter: string;
  threshold: string;
  detectedValue: string;
  issuedAt: string;
  expiresAt: string;
  recommendations: string[];
}

export type TempUnit = 'celsius' | 'fahrenheit';
export type SpeedUnit = 'kmh' | 'mph' | 'ms' | 'knots';
export type PressureUnit = 'hPa' | 'inHg' | 'mmHg';
export type PrecipUnit = 'mm' | 'inch';

export interface UnitPreferences {
  temperature: TempUnit;
  speed: SpeedUnit;
  pressure: PressureUnit;
  precipitation: PrecipUnit;
}

export interface AppSettings {
  theme: 'system' | 'dark' | 'light';
  units: UnitPreferences;
  lowBandwidthMode: boolean;
  notificationsEnabled: boolean;
  alertThresholds: {
    windGustKmh: number;
    extremeHeatC: number;
    extremeColdC: number;
    heavyPrecipMm: number;
    rapidPressureDropHpa: number;
    highUvIndex: number;
    unhealthyAqi: number;
  };
}
