'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { Wifi, WifiOff } from 'lucide-react';
import { SOCKET_URL } from '@/lib/public-env';

export function RealtimeRefresh() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function connect() {
      const response = await fetch('/api/realtime-token', { cache: 'no-store' });
      if (!response.ok || disposed) return;
      const { token } = (await response.json()) as { token: string };
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('attendance:update', () => {
        router.refresh();
      });

      return () => {
        socket.disconnect();
      };
    }

    let cleanup: (() => void) | undefined;
    void connect().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [router]);

  const Icon = connected ? Wifi : WifiOff;

  return (
    <span className={connected ? 'realtime on' : 'realtime'}>
      <Icon aria-hidden="true" size={16} />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
}
