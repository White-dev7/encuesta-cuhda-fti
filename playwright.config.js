// Configuración de pruebas automáticas (QA) — Playwright
const { defineConfig, devices } = require('@playwright/test');
const chrome = process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'qa-reporte' }]],
  use: { baseURL: 'http://127.0.0.1:4173', reducedMotion: 'reduce', trace: process.env.CI ? 'retain-on-failure' : 'off', ...chrome },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce', ...chrome } },
    { name: 'movil', use: { ...devices['Pixel 7'], reducedMotion: 'reduce', ...chrome } }
  ],
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
