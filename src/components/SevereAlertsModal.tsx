import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Volume2,
  Send,
  ExternalLink,
} from 'lucide-react';
import { SevereWeatherAlert } from '../types/weather';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  dispatchWeatherNotification,
  playAlertChime,
} from '../services/notifications';

interface SevereAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SevereWeatherAlert[];
  cityName: string;
}

export const SevereAlertsModal: React.FC<SevereAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  cityName,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      dispatchWeatherNotification(
        'Severe Weather Alerts Enabled',
        `Push notifications active for atmospheric disturbances in ${cityName}.`
      );
    }
  };

  const handleSendTest = () => {
    dispatchWeatherNotification(
      'Test Severe Weather Warning',
      `Live test alert for ${cityName}: Atmospheric pressure plunge & 70 km/h wind gusts simulation.`
    );
    playAlertChime('warning');
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const supported = isNotificationSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Atmospheric Severe Alert Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live severe alerts and push notification dispatch configuration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Push Notification Banner */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Desktop & Mobile Push Alerts
                  </span>
                  {permission === 'granted' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-500">
                      Permission Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive real-time push alerts whenever gale gusts, storms, thermal extremes, or rapid pressure plunges occur.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {permission !== 'granted' ? (
                  <button
                    onClick={handleRequestPermission}
                    disabled={!supported}
                    className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition disabled:opacity-50"
                  >
                    Enable Notifications
                  </button>
                ) : (
                  <button
                    onClick={handleSendTest}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-sky-500" />
                    <span>{testSent ? 'Alert Dispatched!' : 'Test Alert Chime'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Alerts List */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Telemetry Warnings ({alerts.length})
              </h3>
              <span className="text-[11px] font-medium text-slate-500">
                Station: {cityName}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Atmosphere Nominal
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  No destructive wind gusts, extreme thermal stress, or convective storm cells detected within active forecast horizon.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const isExtreme = alert.severity === 'extreme';
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-2xl border p-4 transition ${
                        isExtreme
                          ? 'border-rose-500/40 bg-rose-500/10 dark:border-rose-500/30'
                          : 'border-amber-500/30 bg-amber-500/10 dark:border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isExtreme
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {alert.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          Expires: {alert.expiresAt.slice(11, 16)} UTC
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                        {alert.description}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="rounded-lg bg-white/50 p-2 dark:bg-slate-800/50">
                          <span className="text-slate-400 block text-[9px] uppercase">
                            Parameter & Threshold
                          </span>
                          <strong>
                            {alert.parameter}: {alert.threshold}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-white/50 p-2 dark:bg-slate-800/50">
                          <span className="text-slate-400 block text-[9px] uppercase">
                            Detected Metric
                          </span>
                          <strong className="text-rose-500">{alert.detectedValue}</strong>
                        </div>
                      </div>

                      {/* Safety Directives */}
                      <div className="mt-3 border-t border-slate-200/40 dark:border-slate-700/40 pt-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                          Safety Directives:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                          {alert.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
