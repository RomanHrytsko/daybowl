import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function appVersion(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ command, isPreview }) => ({
  // preview віддає зібраний dist, тож йому потрібен той самий base, що й збірці
  base: command === 'build' || isPreview ? '/daybowl/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Чаша дня',
        short_name: 'Чаша дня',
        description: 'Скільки часу лишається для себе',
        lang: 'uk',
        theme_color: '#f6f3ee',
        // точний колір статус-бару для темної теми задають <meta name="theme-color" media=…> в index.html
        background_color: '#f6f3ee',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ — Playwright (WebKit), запускається окремо: npm run e2e
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: false,
  },
}));
