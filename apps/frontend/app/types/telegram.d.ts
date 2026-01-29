import type { Socket } from 'socket.io-client';
import type { Config } from '@wagmi/core';

declare module '#app' {
  interface NuxtApp {
    $socket?: Socket;
    $telegram?: {
      hapticTrade: () => void;
    };
    $wagmi?: Config;
  }
}

export {};
