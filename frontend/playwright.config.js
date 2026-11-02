import { defineConfig, devices } from '@playwright/test';

const runId = process.pid;
const apiPort = 8010;
const webPort = 4173;
const databasePath = `/tmp/heritagelens-e2e-${runId}.db`;
const uploadPath = `/tmp/heritagelens-e2e-uploads-${runId}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `DATABASE_URL=sqlite:///${databasePath} STORAGE_PROVIDER=local UPLOAD_DIR=${uploadPath} DOCUMENT_PROCESSING_MODE=background DOCUMENT_PROCESSING_WORKERS=1 CURATOR_PASSWORD=e2e-curator-password CURATOR_TOKEN_SECRET=e2e-token-secret-that-is-longer-than-thirty-two-characters ALLOWED_ORIGINS=http://127.0.0.1:${webPort} alembic upgrade head && DATABASE_URL=sqlite:///${databasePath} STORAGE_PROVIDER=local UPLOAD_DIR=${uploadPath} DOCUMENT_PROCESSING_MODE=background DOCUMENT_PROCESSING_WORKERS=1 CURATOR_PASSWORD=e2e-curator-password CURATOR_TOKEN_SECRET=e2e-token-secret-that-is-longer-than-thirty-two-characters ALLOWED_ORIGINS=http://127.0.0.1:${webPort} python3 -m uvicorn app.main:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: '../backend',
      url: `http://127.0.0.1:${apiPort}/api/ready`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `VITE_API_BASE_URL=http://127.0.0.1:${apiPort} npm run dev -- --host 127.0.0.1 --port ${webPort}`,
      cwd: '.',
      url: `http://127.0.0.1:${webPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
