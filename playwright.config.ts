import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

const CI = !!process.env.CI;
const PORT = 4173;

/** Лінійка iPhone 17 + нижня межа 375 px (старші телефони, більший шрифт). */
const phone = (width: number, height: number): NonNullable<PlaywrightTestConfig['use']> => ({
  browserName: 'webkit',
  viewport: { width, height },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'uk-UA',
  timezoneId: 'Europe/Kyiv',
});

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  // Headless WebKit на Linux рендерить програмно: кілька паралельних екземплярів на раннері GitHub
  // зупиняють requestAnimationFrame (1–3 кадри/с), і перевірка «stable» у tap() висить до таймауту.
  workers: CI ? 1 : undefined,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/daybowl/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // service worker кешує збірку між тестами — тут він не потрібен
    serviceWorkers: 'block',
    // застосунок підтримує prefers-reduced-motion: без безкінечних хвиль у чашах і анімації листів
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'iphone-17', use: phone(402, 874) },
    { name: 'iphone-air', use: phone(420, 912) },
    { name: 'iphone-17-pro-max', use: phone(440, 956) },
    { name: 'small-375', use: phone(375, 667) },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/daybowl/`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
