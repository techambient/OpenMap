/**
 * Severe Weather Detection & Push Notification Engine
 */

import { SevereWeatherAlert, WeatherPayload, AppSettings } from '../types/weather';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Play an atmospheric alert chime using Web Audio API (zero external assets)
 */
export function playAlertChime(severity: 'warning' | 'extreme' | 'info' = 'warning') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'extreme' ? 'sawtooth' : 'sine';
    const baseFreq = severity === 'extreme' ? 780 : 520;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // AudioContext might be blocked until user gesture
  }
}

/**
 * Dispatch system notification
 */
export function dispatchWeatherNotification(title: string, body: string) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'severe-weather-alert',
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    playAlertChime('warning');
  } catch (e) {
    console.warn('Notification dispatch error:', e);
  }
}

/**
 * Analyze Weather Payload for Severe Conditions
 */
export function analyzeSevereWeather(
  payload: WeatherPayload,
  settings: AppSettings
): SevereWeatherAlert[] {
  const alerts: SevereWeatherAlert[] = [];
  const { current, hourly, airQuality, location } = payload;
  const thresholds = settings.alertThresholds;

  const nowStr = new Date().toISOString();
  const expires24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // 1. Gale / Severe Wind Gusts
  const maxGust = Math.max(
    current.wind_gusts_10m || 0,
    ...(hourly.wind_gusts_10m?.slice(0, 24) || [0])
  );
  if (maxGust >= thresholds.windGustKmh) {
    const isExtreme = maxGust >= 90;
    alerts.push({
      id: `alert-wind-${location.id}`,
      severity: isExtreme ? 'extreme' : 'warning',
      title: isExtreme ? 'Destructive Wind Hazard' : 'High Wind Warning',
      category: 'wind',
      description: `Peak atmospheric wind gusts measured/forecasted at ${Math.round(maxGust)} km/h exceeding safety criteria.`,
      parameter: 'Wind Gusts',
      threshold: `${thresholds.windGustKmh} km/h`,
      detectedValue: `${Math.round(maxGust)} km/h`,
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Secure outdoor loose structures, furniture, and signage.',
        'Beware of flying debris and downed tree branches.',
        'Avoid high-profile vehicles on exposed bridges and overpasses.',
      ],
    });
  }

  // 2. Thunderstorm Activity (Codes 95, 96, 99)
  const isThunderstorm = [95, 96, 99].includes(current.weather_code);
  const hourlyThunderstorm = hourly.weather_code?.slice(0, 18).some((c) => [95, 96, 99].includes(c));
  if (isThunderstorm || hourlyThunderstorm) {
    const hasHail = [96, 99].includes(current.weather_code) || hourly.weather_code?.slice(0, 18).some((c) => [96, 99].includes(c));
    alerts.push({
      id: `alert-thunder-${location.id}`,
      severity: hasHail ? 'extreme' : 'warning',
      title: hasHail ? 'Severe Thunderstorm & Damaging Hail Alert' : 'Severe Thunderstorm Warning',
      category: 'thunderstorm',
      description: `Active convective atmospheric cells detected. Potential lightning strikes${hasHail ? ', hail impact,' : ''} and sudden microbursts.`,
      parameter: 'Convective Storm Cells',
      threshold: 'WMO 95-99',
      detectedValue: hasHail ? 'Thunderstorm + Hail' : 'Active Thunderstorm',
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Seek indoor shelter immediately away from windows.',
        'Disconnect sensitive electronic equipment.',
        hasHail ? 'Park motor vehicles under protective cover.' : 'Avoid open bodies of water and tall isolated trees.',
      ],
    });
  }

  // 3. Torrential Precipitation / Flash Flood Risk
  const maxHourlyPrecip = Math.max(...(hourly.precipitation?.slice(0, 24) || [0]));
  const sumPrecip24 = (hourly.precipitation?.slice(0, 24) || []).reduce((a, b) => a + (b || 0), 0);
  if (maxHourlyPrecip >= 15 || sumPrecip24 >= thresholds.heavyPrecipMm) {
    alerts.push({
      id: `alert-rain-${location.id}`,
      severity: sumPrecip24 > 50 ? 'extreme' : 'warning',
      title: sumPrecip24 > 50 ? 'Torrential Deluge & Flash Flood Warning' : 'Heavy Rainfall Advisory',
      category: 'precipitation',
      description: `Accumulated rainfall reaching ${sumPrecip24.toFixed(1)} mm over 24 hours (peak rate ${maxHourlyPrecip.toFixed(1)} mm/hr).`,
      parameter: 'Rainfall Accumulation',
      threshold: `${thresholds.heavyPrecipMm} mm/24h`,
      detectedValue: `${sumPrecip24.toFixed(1)} mm`,
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Avoid driving through waterlogged roadways and underpasses.',
        'Monitor local drainage basins and runoff areas.',
        'Keep emergency waterproof gear and flashlight accessible.',
      ],
    });
  }

  // 4. Extreme Thermal Stress (Heat or Cold)
  if (current.apparent_temperature >= thresholds.extremeHeatC) {
    alerts.push({
      id: `alert-heat-${location.id}`,
      severity: current.apparent_temperature >= 42 ? 'extreme' : 'warning',
      title: 'Excessive Heat Index Warning',
      category: 'temperature',
      description: `Thermal apparent temperature calculated at ${Math.round(current.apparent_temperature)}°C (${Math.round((current.apparent_temperature * 9) / 5 + 32)}°F) presenting heatstroke risk.`,
      parameter: 'Heat Index',
      threshold: `${thresholds.extremeHeatC}°C`,
      detectedValue: `${Math.round(current.apparent_temperature)}°C`,
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Maintain high hydration with electrolyte replenishment.',
        'Avoid strenuous outdoor activities between 11:00 and 16:00.',
        'Ensure vulnerable persons and pets have climate-controlled shelter.',
      ],
    });
  } else if (current.apparent_temperature <= thresholds.extremeColdC) {
    alerts.push({
      id: `alert-cold-${location.id}`,
      severity: current.apparent_temperature <= -22 ? 'extreme' : 'warning',
      title: 'Hazardous Wind Chill & Freeze Warning',
      category: 'temperature',
      description: `Apparent wind chill plunging to ${Math.round(current.apparent_temperature)}°C presenting frostbite risks in minutes.`,
      parameter: 'Wind Chill Index',
      threshold: `${thresholds.extremeColdC}°C`,
      detectedValue: `${Math.round(current.apparent_temperature)}°C`,
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Dress in multi-layered thermal insulation with covered extremities.',
        'Limit prolonged skin exposure outdoors.',
        'Protect residential plumbing from freeze bursting.',
      ],
    });
  }

  // 5. Rapid Barometric Pressure Drop (Meteorological Cyclone / Squall precursor)
  if (hourly.pressure_msl && hourly.pressure_msl.length >= 6) {
    const p0 = hourly.pressure_msl[0];
    const p3 = hourly.pressure_msl[3];
    const delta = p0 - p3;
    if (delta >= thresholds.rapidPressureDropHpa) {
      alerts.push({
        id: `alert-pressure-${location.id}`,
        severity: 'watch',
        title: 'Barometric Squall Pressure Plunge',
        category: 'pressure',
        description: `Rapid atmospheric sea-level pressure drop of ${delta.toFixed(1)} hPa detected over a 3-hour period, indicating an approaching intense frontal disturbance.`,
        parameter: '3-Hour Pressure Delta',
        threshold: `-${thresholds.rapidPressureDropHpa} hPa / 3h`,
        detectedValue: `-${delta.toFixed(1)} hPa`,
        issuedAt: nowStr,
        expiresAt: expires24h,
        recommendations: [
          'Prepare for abrupt wind shifts and rapid cloud intensification.',
          'Secure marine moorings if in coastal sectors.',
        ],
      });
    }
  }

  // 6. Extreme UV Index
  const maxUV = Math.max(current.uv_index || 0, ...(hourly.uv_index?.slice(0, 12) || [0]));
  if (maxUV >= thresholds.highUvIndex) {
    alerts.push({
      id: `alert-uv-${location.id}`,
      severity: maxUV >= 11 ? 'extreme' : 'advisory',
      title: maxUV >= 11 ? 'Extreme Ultraviolet Radiation' : 'Very High UV Radiation Alert',
      category: 'uv',
      description: `Peak solar irradiance reaching UV Index ${maxUV.toFixed(1)}. Unprotected skin damage occurs rapidly.`,
      parameter: 'Solar UV Index',
      threshold: `UV ${thresholds.highUvIndex}`,
      detectedValue: `UV ${maxUV.toFixed(1)}`,
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Apply broad-spectrum SPF 50+ sunscreen generously.',
        'Wear UV-filtering polarized sunglasses and wide-brim hat.',
        'Seek midday shade.',
      ],
    });
  }

  // 7. Unhealthy Air Quality
  const usAqi = airQuality?.current?.us_aqi || 0;
  if (usAqi >= thresholds.unhealthyAqi) {
    alerts.push({
      id: `alert-aqi-${location.id}`,
      severity: usAqi >= 200 ? 'extreme' : 'warning',
      title: usAqi >= 200 ? 'Very Hazardous Air Quality' : 'Unhealthy Atmospheric Air Quality',
      category: 'air_quality',
      description: `Air Quality Index measured at US AQI ${usAqi}. Elevated particulate matter concentrations.`,
      parameter: 'Air Quality Index',
      threshold: `AQI ${thresholds.unhealthyAqi}`,
      detectedValue: `AQI ${usAqi}`,
      issuedAt: nowStr,
      expiresAt: expires24h,
      recommendations: [
        'Wear high-filtration respirators (N95/FFP2) outdoors.',
        'Run indoor HEPA air filtration systems.',
        'Vulnerable demographics and asthmatics should remain indoors.',
      ],
    });
  }

  return alerts;
}
