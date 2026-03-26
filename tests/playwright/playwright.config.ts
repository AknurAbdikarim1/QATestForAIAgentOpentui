import os from "node:os";
import { defineConfig } from "@playwright/test";

const hostPlatform = os.platform();

const allProjects = [
  { name: "macos", platform: "darwin" },
  { name: "linux", platform: "linux" },
  { name: "windows-wsl", platform: "linux" },
  { name: "windows-powershell", platform: "win32" },
];

const runAllProjects = process.env.PLAYWRIGHT_ALL_PROJECTS === "1";

const projects = runAllProjects
  ? allProjects.map(({ name }) => ({ name }))
  : allProjects
      .filter((p) => p.platform === hostPlatform)
      .map(({ name }) => ({ name }));

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects,
});
