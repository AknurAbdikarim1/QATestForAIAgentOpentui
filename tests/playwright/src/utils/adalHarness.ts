import os from "node:os";
import type { TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
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
  const raw = process.env.ADAL_READY_REGEX ?? "GPT-|Claude|Gemini|Codex|AdalforPM|\\? for quick reference|\\(main\\)";
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

export function platformLabel(): string {
  const p = os.platform();
  if (p === "darwin") return "macOS";
  if (p === "linux") return "Linux/WSL";
  if (p === "win32") return "Windows";
  return p;
}
