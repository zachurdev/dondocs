/**
 * Service Worker Registration Hook
 *
 * Handles PWA service worker registration and update notifications.
 * Uses vite-plugin-pwa's useRegisterSW hook for automatic updates.
 *
 * With registerType: 'autoUpdate' in vite.config.ts, the service worker
 * updates silently. This hook tracks when updates occur and shows a
 * brief notification after the page reloads with the new version.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const SW_UPDATE_KEY = 'libo-sw-updated';
const SW_UPDATE_SHOWN_KEY = 'libo-sw-update-shown';

export function useServiceWorker() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[SW] Registered:', swUrl);

      // Check for updates periodically (every 60 seconds)
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[SW] Registration error:', error);
    },
  });

  // When needRefresh is true, an update is available and will be applied
  // Mark that an update is pending so we can show banner after reload
  useEffect(() => {
    if (needRefresh) {
      console.log('[SW] Update available, will apply on next reload');
      localStorage.setItem(SW_UPDATE_KEY, Date.now().toString());
      // With autoUpdate, it will reload automatically or on next visit
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // Check if we just loaded after an update
  useEffect(() => {
    const updateTimestamp = localStorage.getItem(SW_UPDATE_KEY);
    const alreadyShown = sessionStorage.getItem(SW_UPDATE_SHOWN_KEY);

    if (updateTimestamp && !alreadyShown) {
      const updateTime = parseInt(updateTimestamp, 10);
      const now = Date.now();

      // Show banner if update was within the last 30 seconds
      // This means the page just reloaded with new content
      if (now - updateTime < 30000) {
        console.log('[SW] Just updated, showing banner');
        setShowUpdateBanner(true);
        sessionStorage.setItem(SW_UPDATE_SHOWN_KEY, 'true');
        localStorage.removeItem(SW_UPDATE_KEY);

        // Auto-hide after 4 seconds
        setTimeout(() => {
          setShowUpdateBanner(false);
        }, 4000);
      } else {
        // Old update marker, clean it up
        localStorage.removeItem(SW_UPDATE_KEY);
      }
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setShowUpdateBanner(false);
  }, []);

  return {
    showUpdateBanner,
    dismissBanner,
    offlineReady,
  };
}
