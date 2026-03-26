import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TerminalAdapter, TerminalStartOptions } from "./terminal";

const execFileAsync = promisify(execFile);

export class PilottyAdapter implements TerminalAdapter {
  constructor(private readonly sessionName: string) {}

  private async run(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("pilotty", args, { maxBuffer: 10 * 1024 * 1024 });
    return stdout?.toString() ?? "";
  }

  private shellCmd(options: TerminalStartOptions): string {
    const adalBin = process.env.ADAL_BIN ?? "adal";
    const args = options.adalArgs?.join(" ") ?? "";
    const envParts = { ADAL_DEV_MODE: "true", ...(options.env ?? {}) };
    const envPrefix = Object.entries(envParts)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    return `${envPrefix} ${adalBin} ${args}`.trim();
  }

  async start(options: TerminalStartOptions): Promise<void> {
    await this.stop().catch(() => undefined);
    const cmd = this.shellCmd(options);
    await this.run(["spawn", "--name", this.sessionName, "bash", "-lc", cmd]);
  }

  async stop(): Promise<void> {
    await this.run(["kill", "--session", this.sessionName]).catch(() => undefined);
  }

  async sendText(text: string): Promise<void> {
    await this.run(["type", "--session", this.sessionName, text]);
  }

  async sendKey(key: string): Promise<void> {
    await this.run(["key", "--session", this.sessionName, key]);
  }

  async captureText(): Promise<string> {
    return this.run(["snapshot", "--session", this.sessionName, "--format", "text"]);
  }

  async waitForText(pattern: RegExp | string, timeoutMs: number): Promise<boolean> {
    const regex = typeof pattern === "string" ? pattern : pattern.source;
    try {
      await this.run(["wait-for", "--session", this.sessionName, "-r", regex, "-t", String(timeoutMs)]);
      return true;
    } catch {
      return false;
    }
  }

  async isAlive(): Promise<boolean> {
    try {
      const out = await this.run(["list-sessions"]);
      return out.includes(`"name": "${this.sessionName}"`);
    } catch {
      return false;
    }
  }
}
