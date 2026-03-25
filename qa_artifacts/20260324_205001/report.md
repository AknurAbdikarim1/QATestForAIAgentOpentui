# AdaL Evergreen Smoke Test Report

- Timestamp: 20260324_205001
- Platform: Darwin
- Terminal: vscode
- User: aknurabdikarim
- Working directory: /Users/aknurabdikarim/QATestForAIAgentOpentui

## Result Table

| ID | Area | Test | Status | Notes |
|---|---|---|---|---|
| SETUP-01 | Setup | Check npm exists | PASS | See qa_artifacts/20260324_205001/logs/SETUP-01.log |
| SETUP-02 | Setup | Check adal exists | PASS | See qa_artifacts/20260324_205001/logs/SETUP-02.log |
| SETUP-03 | Setup | Check pilotty exists | PASS | See qa_artifacts/20260324_205001/logs/SETUP-03.log |
| SETUP-04 | Setup | Check python3 exists | PASS | See qa_artifacts/20260324_205001/logs/SETUP-04.log |
| SETUP-05 | Setup | Install @sylphai/adal-cli@beta | MANUAL | Skipped by --skip-install |
| AUTH-START-01 | Auth & Startup | Startup time (1st launch) | PASS | 1.68s (target <5s) |
| AUTH-START-02 | Auth & Startup | Startup time (2nd launch) | PASS | 1.82s (target <5s) |
| AUTH-01 | Auth & Startup | Run /logout | PASS | See qa_artifacts/20260324_205001/logs/AUTH-01.log |
| AUTH-02 | Auth & Startup | Continue in browser login | MANUAL | Complete login flow; PASS if authenticated session resumes |
| AUTH-03 | Auth & Startup | Run /logout again | PASS | Recovered after session relaunch. See qa_artifacts/20260324_205001/logs/AUTH-03.log |
| AUTH-04 | Auth & Startup | Device code login | MANUAL | Complete device-code flow; PASS if authenticated session resumes |
| INPUT-01 | Input | Copy/paste text works | MANUAL | Validate copy/paste behavior in this terminal |
| INPUT-02 | Input | Copy/paste image works | MANUAL | Validate image paste behavior (known issues possible by terminal) |
| INPUT-03 | Input | Select to copy text in terminal | MANUAL | Mouse selection copy should work |
| INPUT-04 | Input | Drag and drop image | MANUAL | Drop image into Adal input and verify attachment handling |
| INPUT-05 | Input | Type @ to search files | PASS | See qa_artifacts/20260324_205001/logs/INPUT-05.log |
| INPUT-06 | Input | Cursor navigation by click | MANUAL | Pilotty click is terminal-relative; verify click-to-position behavior manually |
| INPUT-07 | Input | History navigation Up/Down | PASS | See qa_artifacts/20260324_205001/logs/INPUT-07.log |
| TOOLS-01 | Core Tools | Read README.md and summarize it in 3 bullet points. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-01.log for quality/speed |
| TOOLS-02 | Core Tools | Create a file named qa_temp_file.txt with one line: hello qa. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-02.log for quality/speed |
| TOOLS-03 | Core Tools | Edit qa_temp_file.txt and append a second line: done. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-03.log for quality/speed |
| TOOLS-04 | Core Tools | Run a shell command to list files matching *.md. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-04.log for quality/speed |
| TOOLS-05 | Core Tools | Find files by name containing conference. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-05.log for quality/speed |
| TOOLS-06 | Core Tools | Search for the word 'Pawprint' across the repo. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-06.log for quality/speed |
| TOOLS-07 | Core Tools | Use web search to find the official website of SylphAI. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-07.log for quality/speed |
| TOOLS-08 | Core Tools | Read https://sylph.ai and summarize key sections. | MANUAL | Review qa_artifacts/20260324_205001/logs/TOOLS-08.log for quality/speed |
| PERF-01 | Core Tasks | Summarize the codebase with a table. | MANUAL | Review qa_artifacts/20260324_205001/logs/PERF-01.log for quality/speed |
| PERF-02 | Core Tasks | Read key files and explain how PM event image generation works. | MANUAL | Review qa_artifacts/20260324_205001/logs/PERF-02.log for quality/speed |
| PERF-03 | Core Tasks | Write a 5-line poem about this repo. | MANUAL | Review qa_artifacts/20260324_205001/logs/PERF-03.log for quality/speed |
| PERF-04 | Core Tasks | Do a research on the existing coding agent. | MANUAL | Review qa_artifacts/20260324_205001/logs/PERF-04.log for quality/speed |
| MCP-01 | MCP | MCP tool usage works smoothly | MANUAL | Run /mcp and execute at least one MCP task |
| SLASH-01 | Core Slash Commands | /init | MANUAL | Review qa_artifacts/20260324_205001/logs/SLASH-01.log for quality/speed |
| SLASH-02 | Core Slash Commands | /init Summarize this repository quickly. | MANUAL | Review qa_artifacts/20260324_205001/logs/SLASH-02.log for quality/speed |
| SLASH-03 | Core Slash Commands | /changelog | MANUAL | Review qa_artifacts/20260324_205001/logs/SLASH-03.log for quality/speed |
| SLASH-04 | Core Slash Commands | /changelog then press i opens browser | MANUAL | Press i and verify browser opens changelog page |
| SLASH-05 | Core Slash Commands | /resume | MANUAL | Review qa_artifacts/20260324_205001/logs/SLASH-05.log for quality/speed |
| SLASH-06 | Core Slash Commands | /compact | MANUAL | Review qa_artifacts/20260324_205001/logs/SLASH-06.log for quality/speed |
| EXIT-01 | Exit | /quit exits Adal | FAIL | Session still running after /quit retries. See qa_artifacts/20260324_205001/logs/EXIT-01.log |
| EXIT-02 | Exit | Exit via /quit is normal | MANUAL | No hanging terminal or abnormal input/mouse behavior |
| EXIT-03 | Exit | Ctrl+C twice exits Adal | PASS | Session terminated as expected. |
| EXIT-04 | Exit | Post Ctrl+C behavior is normal | MANUAL | No abnormal terminal/mouse behavior |
| WEB-01 | AdaL Web | Launch adal --web | PASS | See qa_artifacts/20260324_205001/logs/WEB-01.log |
| WEB-02 | AdaL Web | Web logout/login works | MANUAL | Verify top-left auth actions in browser |
| WEB-03 | AdaL Web | Web query execution works | MANUAL | Run several queries and confirm responses |
| LOGS-01 | Evidence | List ~/.adal/debug_logs | PASS | See qa_artifacts/20260324_205001/logs/LOGS-01.log |

## Startup Timing Summary

| Platform | 1st Startup (s) | 2nd Startup (s) |
|---|---:|---:|
| Darwin | 1.68 | 1.82 |

## Aggregate

- PASS: 13
- FAIL: 1
- MANUAL: 31
- BLOCKED: 0

Artifacts directory: qa_artifacts/20260324_205001
