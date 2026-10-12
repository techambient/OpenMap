import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineBannerProps {
  isCachedData?: boolean;
  cachedTime?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isCachedData, cachedTime }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && !isCachedData) return null;

  const timeFormatted = cachedTime
    ? new Date(cachedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      id="offline-status-banner"
      className="sticky top-0 z-40 w-full border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-md px-4 py-2 text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center justify-between transition-all"
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Offline Mode</strong> — Live network connection unavailable. Utilizing local cached atmospheric telemetry.
            </span>
          </>
        ) : (
          <>
            <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Cached Snapshot</strong> — Displaying stored forecast data.
            </span>
          </>
        )}
      </div>

      {timeFormatted && (
        <span className="text-[11px] opacity-80 shrink-0 ml-2">
          Cached: {timeFormatted}
        </span>
      )}
    </div>
  );
};
