import os from "node:os";
import pty, { type IPty } from "node-pty";
import type { TerminalAdapter, TerminalStartOptions } from "./terminal";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PowerShellAdapter implements TerminalAdapter {
  private proc: IPty | null = null;
  private buffer = "";

  constructor(private readonly sessionName: string) {
    void this.sessionName;
  }

  async start(options: TerminalStartOptions): Promise<void> {
    if (os.platform() !== "win32") {
      throw new Error("PowerShell adapter can only run on Windows.");
    }

    await this.stop();

    this.proc = pty.spawn("powershell.exe", ["-NoLogo", "-NoProfile"], {
      cols: 160,
      rows: 40,
      cwd: process.cwd(),
      env: { ...process.env, ADAL_DEV_MODE: "true", ...(options.env ?? {}) },
      name: "xterm-color",
    });

    this.proc.onData((d) => {
      this.buffer += d;
      if (this.buffer.length > 1_000_000) {
        this.buffer = this.buffer.slice(-500_000);
      }
    });

    const adalBin = process.env.ADAL_BIN ?? "adal";
    const args = options.adalArgs?.join(" ") ?? "";
    this.proc.write(`${adalBin} ${args}\r`);
  }

  async stop(): Promise<void> {
    if (this.proc) {
      try {
        this.proc.kill();
      } catch {
        // ignore
      }
      this.proc = null;
    }
    this.buffer = "";
  }

  async sendText(text: string): Promise<void> {
    if (!this.proc) throw new Error("PowerShell adapter not started.");
    this.proc.write(text);
  }

  async sendKey(key: string): Promise<void> {
    if (!this.proc) throw new Error("PowerShell adapter not started.");
    const keyMap: Record<string, string> = {
      Enter: "\r",
      Up: "\x1b[A",
      Down: "\x1b[B",
      "Ctrl+C": "\x03",
    };
    this.proc.write(keyMap[key] ?? key);
  }

  async captureText(): Promise<string> {
    return this.buffer;
  }

  async waitForText(pattern: RegExp | string, timeoutMs: number): Promise<boolean> {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "m") : pattern;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (regex.test(this.buffer)) return true;
      await sleep(200);
    }
    return false;
  }

  async isAlive(): Promise<boolean> {
    return this.proc !== null;
  }
}
