import os from "node:os";
import type { TestInfo } from "@playwright/test";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TerminalAdapter } from "../adapters/terminal";
import { PilottyAdapter } from "../adapters/pilottyAdapter";
import { PowerShellAdapter } from "../adapters/powershellAdapter";

export function createAdapter(projectName: string, sessionName: string): TerminalAdapter {
  if (projectName === "windows-powershell") {
    return new PowerShellAdapter(sessionName);
  }
  return new PilottyAdapter(sessionName);
}

export function readyRegex(): RegExp {
  const raw =
    process.env.ADAL_READY_REGEX ??
    "GPT-|Claude|Gemini|Codex|AdalforPM|\\? for quick reference|\\(main\\)|Continue in browser|Use device code to sign in|Welcome to AdaL CLI";
  return new RegExp(raw, "m");
}

export async function measureStartup(adapter: TerminalAdapter, sessionName: string): Promise<{ ms: number; ready: boolean }> {
  const started = performance.now();
  await adapter.start({ sessionName, env: { ADAL_DEV_MODE: "true" } });
  const ready = await adapter.waitForText(readyRegex(), 20_000);
  const ms = Math.round(performance.now() - started);
  return { ms, ready };
}

export async function writeArtifact(testInfo: TestInfo, name: string, content: string): Promise<void> {
  const dir = path.join(testInfo.outputDir, "artifacts");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), content, "utf-8");
}

export async function assertFileContains(fileName: string, expectedSubstring: string): Promise<void> {
  const filePath = path.join(process.cwd(), fileName);
  await access(filePath);
  const content = await readFile(filePath, "utf-8");
  if (!content.includes(expectedSubstring)) {
    throw new Error(`File '${fileName}' does not contain expected text '${expectedSubstring}'.`);
  }
}

export async function waitForFileContains(
  fileName: string,
  expectedSubstring: string,
  timeoutMs = 45_000
): Promise<void> {
  const filePath = path.join(process.cwd(), fileName);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      await access(filePath);
      const content = await readFile(filePath, "utf-8");
      if (content.includes(expectedSubstring)) return;
    } catch {
      // File not created yet.
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(
    `Timed out waiting for file '${fileName}' to contain '${expectedSubstring}' within ${timeoutMs}ms.`
  );
}

export async function removeFileIfExists(fileName: string): Promise<void> {
  const filePath = path.join(process.cwd(), fileName);
  await rm(filePath, { force: true });
}

export function platformLabel(): string {
  const p = os.platform();
  if (p === "darwin") return "macOS";
  if (p === "linux") return "Linux/WSL";
  if (p === "win32") return "Windows";
  return p;
}
