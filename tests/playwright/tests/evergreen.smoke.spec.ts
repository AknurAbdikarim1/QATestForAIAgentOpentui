import { expect, test } from "@playwright/test";
import { createAdapter, measureStartup, writeArtifact, readyRegex } from "../src/utils/adalHarness";
import type { TerminalAdapter } from "../src/adapters/terminal";

const startupTargetMs = Number(process.env.ADAL_STARTUP_TARGET_MS ?? "5000");

async function startReady(adapter: TerminalAdapter, sessionName: string): Promise<void> {
  await adapter.start({ sessionName, env: { ADAL_DEV_MODE: "true" } });
  const ready = await adapter.waitForText(readyRegex(), 20_000);
  expect(ready, "Adal should reach ready footer/prompt").toBeTruthy();
}

async function waitForIdle(adapter: TerminalAdapter, timeoutMs = 30_000): Promise<boolean> {
  const started = Date.now();
  let stableCount = 0;

  while (Date.now() - started < timeoutMs) {
    const snap = await adapter.captureText();
    const isBusy = /[◐◓◑◒]/.test(snap);

    if (!isBusy) {
      stableCount += 1;
      if (stableCount >= 2) return true;
    } else {
      stableCount = 0;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return false;
}

test.describe.configure({ mode: "serial" });

test.describe("AdaL Evergreen Smoke", () => {
  test("startup time first and second launch", async ({}, testInfo) => {
    const sessionName = `adal-startup-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    const first = await measureStartup(adapter, sessionName);
    await adapter.stop();

    const second = await measureStartup(adapter, sessionName);
    await adapter.stop();

    const body = [
      `project=${testInfo.project.name}`,
      `first_ms=${first.ms}`,
      `second_ms=${second.ms}`,
      `ready_first=${first.ready}`,
      `ready_second=${second.ready}`,
      `target_ms=${startupTargetMs}`,
    ].join("\n");
    await writeArtifact(testInfo, "startup_metrics.txt", body);

    expect(first.ready).toBeTruthy();
    expect(second.ready).toBeTruthy();
    expect(first.ms, "First launch should be under target").toBeLessThan(startupTargetMs);
    expect(second.ms, "Second launch should be under target").toBeLessThan(startupTargetMs);
  });

  test("slash commands smoke", async ({}, testInfo) => {
    const sessionName = `adal-slash-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await startReady(adapter, sessionName);

    for (const cmd of ["/init", "/resume", "/compact"]) {
      await adapter.sendText(cmd);
      await adapter.sendKey("Enter");
      await adapter.waitForText(/(error|failed|exception)/i, 1500);
      const snap = await adapter.captureText();
      await writeArtifact(testInfo, `slash_${cmd.replace("/", "")}.txt`, snap);
      expect(snap.toLowerCase(), `${cmd} should not throw visible errors`).not.toMatch(/error|failed|exception/);
    }

    await adapter.stop();
  });

  test("core prompt smoke + exit checks", async ({}, testInfo) => {
    const sessionName = `adal-core-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await startReady(adapter, sessionName);

    await adapter.sendText("Summarize the codebase with a table.");
    await adapter.sendKey("Enter");
    const sawOutput = await adapter.waitForText(/summary|table|codebase/i, 30_000);
    const snap = await adapter.captureText();
    await writeArtifact(testInfo, "core_prompt.txt", snap);
    expect(sawOutput, "Core prompt should produce output").toBeTruthy();

    let idle = await waitForIdle(adapter, 20_000);
    if (!idle) {
      await adapter.sendKey("Ctrl+C");
      await new Promise((r) => setTimeout(r, 800));
      idle = await waitForIdle(adapter, 8_000);
    }
    await writeArtifact(testInfo, "pre_exit_idle_state.txt", `idle=${idle}`);

    await adapter.sendText("/quit");
    await adapter.sendKey("Enter");

    let exited = false;
    for (let i = 0; i < 6; i++) {
      if (!(await adapter.isAlive())) {
        exited = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!exited) {
      await adapter.sendKey("Enter");
      for (let i = 0; i < 4; i++) {
        if (!(await adapter.isAlive())) {
          exited = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!exited) {
      await adapter.sendKey("Ctrl+C");
      await new Promise((r) => setTimeout(r, 700));
      await adapter.sendKey("Ctrl+C");
      for (let i = 0; i < 5; i++) {
        if (!(await adapter.isAlive())) {
          exited = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!exited) {
      const exitSnap = await adapter.captureText();
      await writeArtifact(testInfo, "exit_failure_snapshot.txt", exitSnap);
    }

    expect(exited, "Process should exit via /quit or double Ctrl+C").toBeTruthy();
    await adapter.stop();
  });
});
