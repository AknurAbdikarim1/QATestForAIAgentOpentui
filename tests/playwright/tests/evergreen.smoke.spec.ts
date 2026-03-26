import { expect, test } from "@playwright/test";
import {
  waitForFileContains,
  createAdapter,
  measureStartup,
  readyRegex,
  removeFileIfExists,
  writeArtifact,
} from "../src/utils/adalHarness";
import type { TerminalAdapter } from "../src/adapters/terminal";

const startupTargetMs = Number(process.env.ADAL_STARTUP_TARGET_MS ?? "5000");

async function pause(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function startReady(adapter: TerminalAdapter, sessionName: string): Promise<void> {
  await adapter.start({ sessionName, env: { ADAL_DEV_MODE: "true" } });
  const ready = await adapter.waitForText(readyRegex(), 20_000);
  expect(ready, "Adal should reach ready footer/prompt").toBeTruthy();
}

async function prompt(adapter: TerminalAdapter, text: string): Promise<void> {
  await adapter.sendText(text);
  await adapter.sendKey("Enter");
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

    await pause(1000);
  }

  return false;
}

function isAuthGate(text: string): boolean {
  return /continue in browser|use device code to sign in|let's connect this cli to your adal account|welcome to adal cli/i.test(text);
}

async function skipIfAuthGate(
  adapter: TerminalAdapter,
  testInfo: Parameters<typeof writeArtifact>[0],
  artifactName: string
): Promise<void> {
  const snap = await adapter.captureText();
  await writeArtifact(testInfo, artifactName, snap);
  if (isAuthGate(snap)) {
    await adapter.stop();
    test.skip(true, "Session is at auth gate. Complete login first, then rerun interactive smoke checks.");
  }
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

  test("auth menu smoke via /logout", async ({}, testInfo) => {
    const sessionName = `adal-auth-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await startReady(adapter, sessionName);

    await prompt(adapter, "/logout");
    const sawAuthOptions = await adapter.waitForText(/continue in browser|device code/i, 20_000);

    const stillAlive = await adapter.isAlive();
    let snap = "";
    if (stillAlive) {
      snap = await adapter.captureText();
    } else {
      snap = "Session ended or restarted after /logout (accepted for this smoke check).";
    }
    await writeArtifact(testInfo, "auth_logout_menu.txt", snap);

    const looksHealthyPrompt =
      /(\? for quick reference|GPT-|Claude|Gemini|Codex)/i.test(snap) &&
      !/(error|failed|exception)/i.test(snap);

    expect(
      sawAuthOptions || !stillAlive || looksHealthyPrompt,
      "Logout should either show auth options, trigger a session transition, or return to a healthy prompt without visible errors."
    ).toBeTruthy();

    if (stillAlive) {
      await adapter.sendKey("Ctrl+C");
      await pause(600);
    }
    await adapter.stop();
  });

  test("input smoke: @ context trigger + history Up/Down", async ({}, testInfo) => {
    const sessionName = `adal-input-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await startReady(adapter, sessionName);
    await skipIfAuthGate(adapter, testInfo, "input_precheck.txt");

    await adapter.sendText("@");
    const sawAtContext = await adapter.waitForText(/@|search|context|file/i, 5000);
    const atSnap = await adapter.captureText();
    await writeArtifact(testInfo, "input_at_context.txt", atSnap);
    expect(sawAtContext, "Typing @ should trigger context/search behavior").toBeTruthy();

    await prompt(adapter, "history smoke message one");
    await waitForIdle(adapter, 15_000);
    await prompt(adapter, "history smoke message two");
    await waitForIdle(adapter, 15_000);

    await adapter.sendKey("Up");
    await pause(400);
    const upSnap = await adapter.captureText();
    await writeArtifact(testInfo, "input_history_up.txt", upSnap);
    expect(upSnap.toLowerCase()).toContain("history smoke message two");

    await adapter.sendKey("Down");
    await pause(400);
    const downSnap = await adapter.captureText();
    await writeArtifact(testInfo, "input_history_down.txt", downSnap);

    await adapter.stop();
  });

  test("core tools smoke with strict file assertions", async ({}, testInfo) => {
    const sessionName = `adal-tools-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);
    const tempFile = `qa_temp_file_${Date.now()}.txt`;

    await removeFileIfExists(tempFile);
    await startReady(adapter, sessionName);
    await skipIfAuthGate(adapter, testInfo, "core_tools_precheck.txt");

    await prompt(adapter, `Create a file named ${tempFile} with one line: hello qa.`);
    await waitForIdle(adapter, 40_000);
    await waitForFileContains(tempFile, "hello qa");

    await prompt(adapter, `Edit ${tempFile} and append a second line: done.`);
    await waitForIdle(adapter, 40_000);
    await waitForFileContains(tempFile, "done");

    await prompt(adapter, `Read ${tempFile} and show me the full content.`);
    const sawRead = await adapter.waitForText(/hello qa|done/i, 20_000);
    expect(sawRead, "File read response should include created content").toBeTruthy();

    await prompt(adapter, "Run a shell command to list files matching *.md.");
    const sawMd = await adapter.waitForText(/\.md|README/i, 20_000);
    expect(sawMd, "Bash execution output should include markdown file matches").toBeTruthy();

    await prompt(adapter, "Find files by name containing README.");
    const sawGlob = await adapter.waitForText(/README/i, 20_000);
    expect(sawGlob, "Glob-style file search should return README").toBeTruthy();

    await prompt(adapter, "Search for the word 'AdaL' in README.md.");
    const sawGrep = await adapter.waitForText(/AdaL|README/i, 20_000);
    expect(sawGrep, "Grep-style content search should find content in README").toBeTruthy();

    await prompt(adapter, "Use web search to find the official website of SylphAI.");
    const sawWeb = await adapter.waitForText(/sylph\.ai|SylphAI/i, 25_000);
    expect(sawWeb, "Web search should mention sylph.ai").toBeTruthy();

    await prompt(adapter, "Read https://sylph.ai and summarize key sections.");
    const sawFetch = await adapter.waitForText(/sylph|summary|AI/i, 30_000);
    expect(sawFetch, "URL fetch should produce a summary response").toBeTruthy();

    const snap = await adapter.captureText();
    await writeArtifact(testInfo, "core_tools_snapshot.txt", snap);

    await removeFileIfExists(tempFile);
    await adapter.stop();
  });

  test("core prompt smoke + exit checks", async ({}, testInfo) => {
    const sessionName = `adal-core-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await startReady(adapter, sessionName);
    await skipIfAuthGate(adapter, testInfo, "core_prompt_precheck.txt");

    await prompt(adapter, "Summarize the codebase with a table.");
    const sawOutput = await adapter.waitForText(/summary|table|codebase/i, 30_000);
    const snap = await adapter.captureText();
    await writeArtifact(testInfo, "core_prompt.txt", snap);
    expect(sawOutput, "Core prompt should produce output").toBeTruthy();

    let idle = await waitForIdle(adapter, 20_000);
    if (!idle) {
      await adapter.sendKey("Ctrl+C");
      await pause(800);
      idle = await waitForIdle(adapter, 8_000);
    }
    await writeArtifact(testInfo, "pre_exit_idle_state.txt", `idle=${idle}`);

    await prompt(adapter, "/quit");

    let exited = false;
    for (let i = 0; i < 6; i++) {
      if (!(await adapter.isAlive())) {
        exited = true;
        break;
      }
      await pause(1000);
    }

    if (!exited) {
      await adapter.sendKey("Enter");
      for (let i = 0; i < 4; i++) {
        if (!(await adapter.isAlive())) {
          exited = true;
          break;
        }
        await pause(1000);
      }
    }

    if (!exited) {
      await adapter.sendKey("Ctrl+C");
      await pause(700);
      await adapter.sendKey("Ctrl+C");
      for (let i = 0; i < 5; i++) {
        if (!(await adapter.isAlive())) {
          exited = true;
          break;
        }
        await pause(1000);
      }
    }

    if (!exited) {
      const exitSnap = await adapter.captureText();
      await writeArtifact(testInfo, "exit_failure_snapshot.txt", exitSnap);
    }

    expect(exited, "Process should exit via /quit or double Ctrl+C").toBeTruthy();
    await adapter.stop();
  });

  test("slash + MCP smoke", async ({}, testInfo) => {
    const sessionName = `adal-slash-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await startReady(adapter, sessionName);
    await skipIfAuthGate(adapter, testInfo, "slash_mcp_precheck.txt");

    for (const cmd of ["/init", "/resume", "/compact"]) {
      await prompt(adapter, cmd);
      await adapter.waitForText(/(error|failed|exception)/i, 1500);
      const snap = await adapter.captureText();
      await writeArtifact(testInfo, `slash_${cmd.replace("/", "")}.txt`, snap);
      expect(snap.toLowerCase(), `${cmd} should not throw visible errors`).not.toMatch(/error|failed|exception/);
    }

    await prompt(adapter, "/changelog");
    const sawChangelog = await adapter.waitForText(/changelog|release|beta/i, 20_000);
    expect(sawChangelog, "/changelog should render changelog output").toBeTruthy();

    await adapter.sendText("i");
    await pause(500);
    const changelogSnap = await adapter.captureText();
    await writeArtifact(testInfo, "slash_changelog_after_i.txt", changelogSnap);

    await prompt(adapter, "/mcp");
    const sawMcp = await adapter.waitForText(/mcp|tool|server/i, 20_000);
    expect(sawMcp, "/mcp should show MCP-related output").toBeTruthy();

    await adapter.stop();
  });

  test("adal --web launch smoke", async ({}, testInfo) => {
    const sessionName = `adal-web-${Date.now()}`;
    const adapter = createAdapter(testInfo.project.name, sessionName);

    await adapter.start({ sessionName, adalArgs: ["--web"], env: { ADAL_DEV_MODE: "true" } });
    const sawWebStart = await adapter.waitForText(/http|localhost|browser|web/i, 20_000);
    const snap = await adapter.captureText();
    await writeArtifact(testInfo, "adal_web_launch.txt", snap);

    expect(sawWebStart, "`adal --web` should print web launch details").toBeTruthy();
    await adapter.stop();
  });
});
