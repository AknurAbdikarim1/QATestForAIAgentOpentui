# AdaL Evergreen Smoke Test Report

- Timestamp: 20260324_202249
- Platform: Darwin
- Terminal: vscode
- User: aknurabdikarim
- Working directory: /Users/aknurabdikarim/QATestForAIAgentOpentui

## Result Table

| ID | Area | Test | Status | Notes |
|---|---|---|---|---|
| SETUP-01 | Setup | Check npm exists | PASS | See qa_artifacts/20260324_202249/logs/SETUP-01.log |
| SETUP-02 | Setup | Check adal exists | PASS | See qa_artifacts/20260324_202249/logs/SETUP-02.log |
| SETUP-03 | Setup | Check pilotty exists | PASS | See qa_artifacts/20260324_202249/logs/SETUP-03.log |
| SETUP-04 | Setup | Check python3 exists | PASS | See qa_artifacts/20260324_202249/logs/SETUP-04.log |
| SETUP-05 | Setup | Install @sylphai/adal-cli@beta | MANUAL | Skipped by --skip-install |
| AUTH-START-01 | Auth & Startup | Startup time (1st launch) | PASS | 2.93s (target <5s) |
| AUTH-START-02 | Auth & Startup | Startup time (2nd launch) | PASS | 2.48s (target <5s) |
| AUTH-01 | Auth & Startup | Run /logout | PASS | See qa_artifacts/20260324_202249/logs/AUTH-01.log |
| AUTH-02 | Auth & Startup | Continue in browser login | MANUAL | Complete login flow; PASS if authenticated session resumes |
| AUTH-03 | Auth & Startup | Run /logout again | FAIL | See qa_artifacts/20260324_202249/logs/AUTH-03.log |
| AUTH-04 | Auth & Startup | Device code login | MANUAL | Complete device-code flow; PASS if authenticated session resumes |
| INPUT-01 | Input | Copy/paste text works | MANUAL | Validate copy/paste behavior in this terminal |
| INPUT-02 | Input | Copy/paste image works | MANUAL | Validate image paste behavior (known issues possible by terminal) |
| INPUT-03 | Input | Select to copy text in terminal | MANUAL | Mouse selection copy should work |
| INPUT-04 | Input | Drag and drop image | MANUAL | Drop image into Adal input and verify attachment handling |
| INPUT-05 | Input | Type @ to search files | FAIL | See qa_artifacts/20260324_202249/logs/INPUT-05.log |
| INPUT-06 | Input | Cursor navigation by click | MANUAL | Pilotty click is terminal-relative; verify click-to-position behavior manually |
| INPUT-07 | Input | History navigation Up/Down | FAIL | See qa_artifacts/20260324_202249/logs/INPUT-07.log |
| TOOLS-01 | Core Tools | Read README.md and summarize it in 3 bullet points. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-01.log |
| TOOLS-02 | Core Tools | Create a file named qa_temp_file.txt with one line: hello qa. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-02.log |
| TOOLS-03 | Core Tools | Edit qa_temp_file.txt and append a second line: done. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-03.log |
| TOOLS-04 | Core Tools | Run a shell command to list files matching *.md. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-04.log |
| TOOLS-05 | Core Tools | Find files by name containing conference. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-05.log |
| TOOLS-06 | Core Tools | Search for the word 'Pawprint' across the repo. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-06.log |
| TOOLS-07 | Core Tools | Use web search to find the official website of SylphAI. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-07.log |
| TOOLS-08 | Core Tools | Read https://sylph.ai and summarize key sections. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/TOOLS-08.log |
| PERF-01 | Core Tasks | Summarize the codebase with a table. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/PERF-01.log |
| PERF-02 | Core Tasks | Read key files and explain how PM event image generation works. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/PERF-02.log |
| PERF-03 | Core Tasks | Write a 5-line poem about this repo. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/PERF-03.log |
| PERF-04 | Core Tasks | Do a research on the existing coding agent. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/PERF-04.log |
| MCP-01 | MCP | MCP tool usage works smoothly | MANUAL | Run /mcp and execute at least one MCP task |
| SLASH-01 | Core Slash Commands | /init | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/SLASH-01.log |
| SLASH-02 | Core Slash Commands | /init Summarize this repository quickly. | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/SLASH-02.log |
| SLASH-03 | Core Slash Commands | /changelog | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/SLASH-03.log |
| SLASH-04 | Core Slash Commands | /changelog then press i opens browser | MANUAL | Press i and verify browser opens changelog page |
| SLASH-05 | Core Slash Commands | /resume | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/SLASH-05.log |
| SLASH-06 | Core Slash Commands | /compact | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/SLASH-06.log |
| EXIT-01 | Exit | /quit | FAIL | Prompt execution failed. See qa_artifacts/20260324_202249/logs/EXIT-01.log |
| EXIT-02 | Exit | Exit via /quit is normal | MANUAL | No hanging terminal or abnormal input/mouse behavior |
| EXIT-03 | Exit | Ctrl+C twice exits normally | PASS | See qa_artifacts/20260324_202249/logs/EXIT-03.log |
| EXIT-04 | Exit | Post Ctrl+C behavior is normal | MANUAL | No abnormal terminal/mouse behavior |
| WEB-01 | AdaL Web | Launch adal --web | PASS | See qa_artifacts/20260324_202249/logs/WEB-01.log |
| WEB-02 | AdaL Web | Web logout/login works | MANUAL | Verify top-left auth actions in browser |
| WEB-03 | AdaL Web | Web query execution works | MANUAL | Run several queries and confirm responses |
| LOGS-01 | Evidence | List ~/.adal/debug_logs | PASS | See qa_artifacts/20260324_202249/logs/LOGS-01.log |

## Startup Timing Summary

| Platform | 1st Startup (s) | 2nd Startup (s) |
|---|---:|---:|
| Darwin | 2.93 | 2.48 |

## Aggregate

- PASS: 10
- FAIL: 21
- MANUAL: 14
- BLOCKED: 0

Artifacts directory: qa_artifacts/20260324_202249
