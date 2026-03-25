# QA Test For AI Agent OpenTUI
# AdaL Evergreen Smoke Test Harness (Pilotty-Assisted)

## What was done

A single-run QA harness script was added:

- `run_adal_evergreen_smoke.sh`

This script runs a broad **Evergreen Smoke Test** flow for AdaL CLI using `pilotty` as a terminal automation layer and records structured outputs into timestamped artifacts.

---

## Why this was done

The goal is to make release QA:

1. **Repeatable** – same core checks every release.
2. **Faster** – automate all terminal-friendly checks in one run.
3. **Traceable** – store logs/snapshots/report so results are auditable.
4. **Cross-platform ready** – designed to run per platform (macOS, Linux, Windows WSL, Windows PowerShell with compatible shell flow).

Not all checks are fully automatable (browser/UI/mouse-specific flows), so the script includes **manual checkpoints** with explicit prompts and records those decisions in the same report.

---

## How `adal-test` is used

The script creates a Pilotty session named:

- `adal-smoke` (primary test session)
- `adal-web` (for web launch check)

AdaL is launched in debug mode in the test session:

- `ADAL_DEV_MODE=true adal`

This allows:

- terminal automation via `pilotty type`, `pilotty key`, `pilotty wait-for`, `pilotty snapshot`
- session diagnostics and debug logs under `~/.adal/debug_logs`

---

## Prerequisites checked by the script

The harness verifies:

- `npm`
- `adal`
- `pilotty`
- `python3`

It can also install beta CLI:

- `npm install -g @sylphai/adal-cli@beta`

(Use `--skip-install` to skip this step.)

---

## Checklist coverage in the script

## 1) Setup
- Tool availability checks
- Optional install of `@sylphai/adal-cli@beta`

## 2) Auth & Startup
- Startup time measured for:
  - 1st launch
  - 2nd launch
- `/logout` run
- Manual outcome prompts for:
  - Continue in browser login
  - Device code login

## 3) Input
- Manual checks:
  - text copy/paste
  - image paste
  - select to copy
  - drag/drop image
  - cursor click positioning
- Automated checks:
  - `@` file-search trigger snapshot
  - Up/Down history navigation snapshot

## 4) Core tools (prompt-driven checks)
Prompts are sent for:
- file read
- file create
- file edit
- bash execution
- glob-style search
- grep-style search
- web search
- URL fetch

## 5) Core task/performance prompts
- “Summarize the codebase with a table”
- “Read key files and explain how PM event image generation works”
- “Write a 5-line poem about this repo”
- “Do a research on the existing coding agent”

These are marked for manual quality/speed review using logged output.

## 6) MCP
- Manual checkpoint to validate `/mcp` usability and execution behavior.

## 7) Core slash commands
- `/init`
- `/init <query>`
- `/changelog`
- manual check for pressing `i` in changelog
- `/resume`
- `/compact`

## 8) Exit behavior
- `/quit` and manual post-exit behavior check
- relaunch then `Ctrl+C` twice
- manual post-exit behavior check

## 9) AdaL Web
- launch check via `adal --web`
- manual checks:
  - web logout/login
  - running queries in web UI

## 10) Evidence
- Lists `~/.adal/debug_logs`
- captures snapshots/logs/report into artifact directory

---

## What outputs are produced

Each run creates:

- `qa_artifacts/<timestamp>/report.md`
- `qa_artifacts/<timestamp>/snapshots/*.txt`
- `qa_artifacts/<timestamp>/logs/*.log`

### `report.md` contains
- environment metadata (platform, terminal, user, cwd)
- result table with:
  - test ID
  - area
  - test name
  - status (`PASS`, `FAIL`, `MANUAL`, `BLOCKED`)
  - notes/log pointer
- startup timing summary (1st/2nd launch)
- aggregate counters

### snapshots/logs contain
- terminal screen captures from pilotty
- per-step command and prompt execution logs
- spawn/wait timing evidence

---

## Status meanings

- **PASS**: check completed successfully.
- **FAIL**: check failed; inspect linked log.
- **MANUAL**: requires human review/judgment.
- **BLOCKED**: could not execute due to environment/external blockers.

---

## How to run

```bash
./run_adal_evergreen_smoke.sh
```

Skip reinstall step:

```bash
./run_adal_evergreen_smoke.sh --skip-install
```

---

## Suggested cross-platform execution process

Run once per environment and keep separate artifacts:

- macOS (iTerm + VSCode terminal as needed)
- Linux
- Windows WSL
- Windows PowerShell (with equivalent launch flow)

Then compare startup timings and failure patterns across platforms.

---

## Notes / limitations

- Browser-based auth and rich UI interactions (drag/drop image, mouse behavior verification, browser correctness) are intentionally **manual checkpoints**.
- Prompt quality/speed checks are captured automatically but still require human scoring.
- Terminal differences (e.g., image paste support) can vary by emulator and OS; this is expected and should be recorded in report notes.