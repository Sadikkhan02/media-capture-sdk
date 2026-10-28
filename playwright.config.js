import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  use: {
    headless: true,
    browserName: "chromium",
    launchOptions: {
      executablePath: "/usr/bin/google-chrome",
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
  },
  webServer: {
    command: "node tests/browser/test-server.js",
    port: 3344,
    reuseExistingServer: !process.env.CI,
  },
});
