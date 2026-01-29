import type { Config } from 'tailwindcss';

export default <Partial<Config>>{
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
        neon: '#00f5ff',
        accent: '#7c3aed',
        success: '#12d6a7',
        danger: '#ff4d6d',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 245, 255, 0.25)',
      },
    },
  },
  plugins: [],
};
