import { init, miniApp, hapticFeedback } from '@telegram-apps/sdk';

export default defineNuxtPlugin(() => {
  if (!process.client) return;

  try {
    init();
    miniApp.setHeaderColor('#0b0f1a');
    miniApp.setBackgroundColor('#0b0f1a');
    miniApp.expand();
  } catch {
    // Telegram SDK is optional in non-TMA contexts.
  }

  const hapticTrade = () => {
    try {
      hapticFeedback.impactOccurred('light');
    } catch {
      // Ignore haptic errors outside of Telegram.
    }
  };

  return {
    provide: {
      telegram: {
        hapticTrade,
      },
    },
  };
});
