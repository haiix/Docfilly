import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const host = "127.0.0.1";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL: `http://${host}:${port}/Docfilly/`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --host ${host} --port ${port}`,
    url: `http://${host}:${port}/Docfilly/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
