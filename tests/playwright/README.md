# AdaL Playwright Smoke Harness

## Quick start

```bash
cd tests/playwright
npm install
npm run install:browsers
```

Run all projects:
```bash
npm run test:smoke
```

Run one project:
```bash
npx playwright test tests/evergreen.smoke.spec.ts --project=macos
npx playwright test tests/evergreen.smoke.spec.ts --project=linux
npx playwright test tests/evergreen.smoke.spec.ts --project=windows-wsl
npx playwright test tests/evergreen.smoke.spec.ts --project=windows-powershell
```

## Requirements by project

- macOS / Linux / WSL:
  - `pilotty` installed and available in PATH
  - `adal` installed (`npm install -g @sylphai/adal-cli@beta`)
- windows-powershell:
  - `adal` in PATH
  - uses `node-pty` adapter (ConPTY)

## Environment

- `ADAL_DEV_MODE=true` is set by the harness.
- Optional:
  - `ADAL_BIN` (default: `adal`)
  - `ADAL_READY_REGEX` override ready signal
  - `ADAL_STARTUP_TARGET_MS` (default: `5000`)

## What is covered in scaffold

- Startup timing (1st / 2nd launch)
- Slash command smoke (`/init`, `/resume`, `/compact`)
- Core prompt smoke (summary query)
- Exit behavior (`/quit`, Ctrl+C twice)

Extend with:
- Auth browser/device flows (Playwright browser + terminal handoff)
- Clipboard checks (platform-specific commands)
- File create/edit/read assertions in temp dirs
- `adal --web` browser launch checks
