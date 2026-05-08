import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { replayPendingWrites } from '../db/sync';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const POLL_INTERVAL = 30_000;

async function checkOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(`${BASE_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function poll() {
      const online = await checkOnline();
      setIsOnline(online);

      if (online && wasOffline.current) {
        // Transitioned offline → online
        replayPendingWrites().catch(() => {});
      }
      wasOffline.current = !online;
    }

    poll();
    interval = setInterval(poll, POLL_INTERVAL);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return { isOnline };
}
