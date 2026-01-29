// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  app: {
    head: {
      title: 'Ares-Nexus',
      meta: [
        { name: 'theme-color', content: '#0b0f1a' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      wsUrl: 'http://localhost:3000',
      wsPath: '/ws/market-data',
      defaultMarketId: 'BTC-USD',
      walletConnectProjectId: process.env.NUXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
      apiUrl: 'http://localhost:3000',
    },
  },
})
