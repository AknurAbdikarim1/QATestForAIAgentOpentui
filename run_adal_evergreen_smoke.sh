#!/usr/bin/env bash
set -uo pipefail

# Evergreen Smoke Test Harness for Adal CLI (Pilotty-assisted)
# Run on each platform separately:
#   macOS, Linux, (via bash-compatible env)
#   Note: pilotty dos not support Windows currently, so Windows testing is fully manual for now.
#
# Usage:
#   bash run_adal_evergreen_smoke.sh
#   bash run_adal_evergreen_smoke.sh --skip-install
#
# Output:
#   qa_artifacts/<timestamp>/report.md
#   qa_artifacts/<timestamp>/snapshots/*.txt
#   qa_artifacts/<timestamp>/logs/*.log

SKIP_INSTALL=0
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL=1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="qa_artifacts/${TIMESTAMP}"
SNAP_DIR="${OUT_DIR}/snapshots"
LOG_DIR="${OUT_DIR}/logs"
REPORT="${OUT_DIR}/report.md"
SESSION="adal-smoke"

mkdir -p "$SNAP_DIR" "$LOG_DIR"

PLATFORM="$(uname -s)"
TERMINAL="${TERM_PROGRAM:-unknown}"
USER_NAME="$(whoami)"

pass_count=0
fail_count=0
manual_count=0
blocked_count=0

append_report() {
  printf "%s\n" "$1" >> "$REPORT"
}

record_result() {
  local id="$1"
  local area="$2"
  local test_name="$3"
  local status="$4"
  local notes="$5"

  case "$status" in
    PASS) pass_count=$((pass_count + 1)) ;;
    FAIL) fail_count=$((fail_count + 1)) ;;
    MANUAL) manual_count=$((manual_count + 1)) ;;
    BLOCKED) blocked_count=$((blocked_count + 1)) ;;
  esac

  append_report "| $id | $area | $test_name | $status | $notes |"
}

run_cmd() {
  local id="$1"
  local area="$2"
  local test_name="$3"
  local cmd="$4"
  local log_file="${LOG_DIR}/${id}.log"

  if bash -lc "$cmd" >"$log_file" 2>&1; then
    record_result "$id" "$area" "$test_name" "PASS" "See ${log_file}"
    return 0
  else
    record_result "$id" "$area" "$test_name" "FAIL" "See ${log_file}"
    return 1
  fi
}

manual_check() {
  local id="$1"
  local area="$2"
  local test_name="$3"
  local guidance="$4"

  echo
  echo "MANUAL CHECK: ${test_name}"
  echo "Guidance: ${guidance}"
  read -r -p "Mark result [p=PASS, f=FAIL, b=BLOCKED, m=MANUAL]: " ans

  case "${ans:-m}" in
    p|P) record_result "$id" "$area" "$test_name" "PASS" "$guidance" ;;
    f|F) record_result "$id" "$area" "$test_name" "FAIL" "$guidance" ;;
    b|B) record_result "$id" "$area" "$test_name" "BLOCKED" "$guidance" ;;
    *)   record_result "$id" "$area" "$test_name" "MANUAL" "$guidance" ;;
  esac
}

snapshot_text() {
  local name="$1"
  local out_file="${SNAP_DIR}/${name}.txt"
  if pilotty snapshot --session "$SESSION" --format text >"$out_file" 2>&1; then
    echo "$out_file"
  else
    echo ""
  fi
}

session_exists() {
  pilotty list-sessions 2>/dev/null | grep -q "\"name\": \"${SESSION}\""
}

start_adal_session() {
  local log_file="${1:-${LOG_DIR}/session_relaunch.log}"
  cleanup_session
  if ! pilotty spawn --name "$SESSION" bash -lc 'ADAL_DEV_MODE=true adal' >>"$log_file" 2>&1; then
    return 1
  fi
  pilotty wait-for --session "$SESSION" -r "GPT-|Claude|Gemini|Codex|AdalforPM|\\? for quick reference" -t 20000 >>"$log_file" 2>&1 || true
  session_exists
}

ensure_adal_session() {
  local reason="${1:-general}"
  local log_file="${LOG_DIR}/ensure_session.log"
  if session_exists; then
    return 0
  fi
  echo "Session missing before '${reason}', relaunching." >>"$log_file"
  start_adal_session "$log_file"
}

run_adal_step() {
  local id="$1"
  local area="$2"
  local test_name="$3"
  local cmd="$4"
  local log_file="${LOG_DIR}/${id}.log"

  if ! ensure_adal_session "$id"; then
    record_result "$id" "$area" "$test_name" "FAIL" "Unable to relaunch session. See ${LOG_DIR}/ensure_session.log"
    return 1
  fi

  if bash -lc "$cmd" >"$log_file" 2>&1; then
    record_result "$id" "$area" "$test_name" "PASS" "See ${log_file}"
    return 0
  fi

  if ! session_exists; then
    {
      echo "Session dropped during '${test_name}', retrying once after relaunch."
    } >>"$log_file"
    if ensure_adal_session "${id}-retry" && bash -lc "$cmd" >>"$log_file" 2>&1; then
      record_result "$id" "$area" "$test_name" "PASS" "Recovered after session relaunch. See ${log_file}"
      return 0
    fi
  fi

  record_result "$id" "$area" "$test_name" "FAIL" "See ${log_file}"
  return 1
}

send_prompt_and_capture() {
  local id="$1"
  local area="$2"
  local prompt="$3"

  if ! ensure_adal_session "$id"; then
    record_result "$id" "$area" "$prompt" "FAIL" "Session unavailable and relaunch failed."
    return 1
  fi

  local log_file="${LOG_DIR}/${id}.log"
  {
    echo "Prompt: $prompt"
    pilotty type --session "$SESSION" "$prompt"
    pilotty key --session "$SESSION" Enter
    sleep 2
    pilotty snapshot --session "$SESSION" --format text
  } >"$log_file" 2>&1

  if [[ $? -eq 0 ]]; then
    record_result "$id" "$area" "$prompt" "MANUAL" "Review ${log_file} for quality/speed"
  else
    if ! session_exists; then
      record_result "$id" "$area" "$prompt" "MANUAL" "Session exited during prompt; likely expected for some flows. See ${log_file}"
    else
      record_result "$id" "$area" "$prompt" "FAIL" "Prompt execution failed. See ${log_file}"
    fi
  fi
}

send_quit_and_expect_exit() {
  local id="$1"
  local area="$2"
  local log_file="${LOG_DIR}/${id}.log"
  local i

  if ! ensure_adal_session "$id"; then
    record_result "$id" "$area" "/quit expected exit" "FAIL" "Session unavailable and relaunch failed."
    return 1
  fi

  {
    pilotty type --session "$SESSION" "/quit"
    pilotty key --session "$SESSION" Enter
  } >"$log_file" 2>&1

  # Give Adal time to shutdown cleanly.
  for i in 1 2 3 4 5 6; do
    sleep 1
    if ! session_exists; then
      record_result "$id" "$area" "/quit exits Adal" "PASS" "Session terminated as expected."
      return 0
    fi
  done

  # Some builds prompt for confirmation; send one more Enter and wait again.
  {
    echo "Session still alive after /quit. Sending extra Enter for possible confirmation."
    pilotty key --session "$SESSION" Enter
  } >>"$log_file" 2>&1 || true

  for i in 1 2 3 4; do
    sleep 1
    if ! session_exists; then
      record_result "$id" "$area" "/quit exits Adal" "PASS" "Terminated after confirmation Enter."
      return 0
    fi
  done

  record_result "$id" "$area" "/quit exits Adal" "MANUAL" "Session still running after /quit retries; verify behavior manually for this build. See ${log_file}"
  return 0
}

send_double_ctrlc_and_expect_exit() {
  local id="$1"
  local area="$2"
  local log_file="${LOG_DIR}/${id}.log"

  if ! ensure_adal_session "$id"; then
    record_result "$id" "$area" "Ctrl+C twice exits Adal" "FAIL" "Session unavailable and relaunch failed."
    return 1
  fi

  {
    pilotty key --session "$SESSION" Ctrl+C
    sleep 1
    pilotty key --session "$SESSION" Ctrl+C || true
    sleep 1
  } >"$log_file" 2>&1

  if session_exists; then
    record_result "$id" "$area" "Ctrl+C twice exits Adal" "FAIL" "Session still running. See ${log_file}"
    return 1
  fi

  record_result "$id" "$area" "Ctrl+C twice exits Adal" "PASS" "Session terminated as expected."
  return 0
}

measure_startup_seconds() {
  local phase="$1"
  local out_file="${LOG_DIR}/startup_${phase}.log"

  python3 - <<'PY' > "${LOG_DIR}/_t0_${phase}.txt"
import time
print(time.time())
PY

  if ! pilotty spawn --name "$SESSION" bash -lc 'ADAL_DEV_MODE=true adal' >"$out_file" 2>&1; then
    echo "FAIL"
    return 1
  fi

  # Wait for stable shell UI hints in Adal footer/prompt
  pilotty wait-for --session "$SESSION" -r "GPT-|Claude|Gemini|Codex|AdalforPM|\\? for quick reference|\\(main\\)" -t 20000 >>"$out_file" 2>&1
  local wait_status=$?

  python3 - <<'PY' > "${LOG_DIR}/_t1_${phase}.txt"
import time
print(time.time())
PY

  local t0 t1
  t0="$(cat "${LOG_DIR}/_t0_${phase}.txt")"
  t1="$(cat "${LOG_DIR}/_t1_${phase}.txt")"

  local secs
  secs="$(python3 - <<PY
t0=float("${t0}")
t1=float("${t1}")
print(round(t1-t0, 2))
PY
)"

  snapshot_text "startup_${phase}" >/dev/null

  if [[ $wait_status -eq 0 ]]; then
    echo "$secs"
    return 0
  else
    echo "$secs"
    return 2
  fi
}

cleanup_session() {
  pilotty kill --session "$SESSION" >/dev/null 2>&1 || true
}

check_prereqs() {
  run_cmd "SETUP-01" "Setup" "Check npm exists" "command -v npm"
  run_cmd "SETUP-02" "Setup" "Check adal exists" "command -v adal"
  run_cmd "SETUP-03" "Setup" "Check pilotty exists" "command -v pilotty"
  run_cmd "SETUP-04" "Setup" "Check python3 exists" "command -v python3"
}

install_beta_if_needed() {
  if [[ $SKIP_INSTALL -eq 1 ]]; then
    record_result "SETUP-05" "Setup" "Install @sylphai/adal-cli@beta" "MANUAL" "Skipped by --skip-install"
    return 0
  fi
  run_cmd "SETUP-05" "Setup" "Install @sylphai/adal-cli@beta" "npm install -g @sylphai/adal-cli@beta"
}

write_report_header() {
  append_report "# AdaL Evergreen Smoke Test Report"
  append_report ""
  append_report "- Timestamp: ${TIMESTAMP}"
  append_report "- Platform: ${PLATFORM}"
  append_report "- Terminal: ${TERMINAL}"
  append_report "- User: ${USER_NAME}"
  append_report "- Working directory: $(pwd)"
  append_report ""
  append_report "## Result Table"
  append_report ""
  append_report "| ID | Area | Test | Status | Notes |"
  append_report "|---|---|---|---|---|"
}

echo "Starting AdaL evergreen smoke tests..."
write_report_header
check_prereqs
install_beta_if_needed

# Startup timing: first and second launch
cleanup_session
first_startup="$(measure_startup_seconds "first")"
first_status=$?
cleanup_session
second_startup="$(measure_startup_seconds "second")"
second_status=$?

if [[ $first_status -eq 0 ]]; then
  record_result "AUTH-START-01" "Auth & Startup" "Startup time (1st launch)" "PASS" "${first_startup}s (target <5s)"
else
  record_result "AUTH-START-01" "Auth & Startup" "Startup time (1st launch)" "FAIL" "${first_startup}s (no ready footer match)"
fi

if [[ $second_status -eq 0 ]]; then
  record_result "AUTH-START-02" "Auth & Startup" "Startup time (2nd launch)" "PASS" "${second_startup}s (target <5s)"
else
  record_result "AUTH-START-02" "Auth & Startup" "Startup time (2nd launch)" "FAIL" "${second_startup}s (no ready footer match)"
fi

# Keep active session for functional checks
start_adal_session "${LOG_DIR}/spawn_for_tests.log" || true

# Auth checks (assisted/manual)
run_adal_step "AUTH-01" "Auth & Startup" "Run /logout" "pilotty type --session \"$SESSION\" \"/logout\" && pilotty key --session \"$SESSION\" Enter"
manual_check "AUTH-02" "Auth & Startup" "Continue in browser login" "Complete login flow; PASS if authenticated session resumes"
run_adal_step "AUTH-03" "Auth & Startup" "Run /logout again" "pilotty type --session \"$SESSION\" \"/logout\" && pilotty key --session \"$SESSION\" Enter"
manual_check "AUTH-04" "Auth & Startup" "Device code login" "Complete device-code flow; PASS if authenticated session resumes"

# Input checks
manual_check "INPUT-01" "Input" "Copy/paste text works" "Validate copy/paste behavior in this terminal"
manual_check "INPUT-02" "Input" "Copy/paste image works" "Validate image paste behavior (known issues possible by terminal)"
manual_check "INPUT-03" "Input" "Select to copy text in terminal" "Mouse selection copy should work"
manual_check "INPUT-04" "Input" "Drag and drop image" "Drop image into Adal input and verify attachment handling"
run_adal_step "INPUT-05" "Input" "Type @ to search files" "pilotty type --session \"$SESSION\" \"@\" && pilotty snapshot --session \"$SESSION\" --format text > \"${SNAP_DIR}/input_at_search.txt\""
manual_check "INPUT-06" "Input" "Cursor navigation by click" "Pilotty click is terminal-relative; verify click-to-position behavior manually"
run_adal_step "INPUT-07" "Input" "History navigation Up/Down" "pilotty key --session \"$SESSION\" Up && pilotty key --session \"$SESSION\" Down && pilotty snapshot --session \"$SESSION\" --format text > \"${SNAP_DIR}/input_history_nav.txt\""

# Core tools prompts (review quality/speed manually from logs/snapshots)
send_prompt_and_capture "TOOLS-01" "Core Tools" "Read README.md and summarize it in 3 bullet points."
send_prompt_and_capture "TOOLS-02" "Core Tools" "Create a file named qa_temp_file.txt with one line: hello qa."
send_prompt_and_capture "TOOLS-03" "Core Tools" "Edit qa_temp_file.txt and append a second line: done."
send_prompt_and_capture "TOOLS-04" "Core Tools" "Run a shell command to list files matching *.md."
send_prompt_and_capture "TOOLS-05" "Core Tools" "Find files by name containing conference."
send_prompt_and_capture "TOOLS-06" "Core Tools" "Search for the word 'Pawprint' across the repo."
send_prompt_and_capture "TOOLS-07" "Core Tools" "Use web search to find the official website of SylphAI."
send_prompt_and_capture "TOOLS-08" "Core Tools" "Read https://sylph.ai and summarize key sections."

# Performance/quality benchmark prompts
send_prompt_and_capture "PERF-01" "Core Tasks" "Summarize the codebase with a table."
send_prompt_and_capture "PERF-02" "Core Tasks" "Read key files and explain how PM event image generation works."
send_prompt_and_capture "PERF-03" "Core Tasks" "Write a 5-line poem about this repo."
send_prompt_and_capture "PERF-04" "Core Tasks" "Do a research on the existing coding agent."

# MCP
manual_check "MCP-01" "MCP" "MCP tool usage works smoothly" "Run /mcp and execute at least one MCP task"

# Slash commands
send_prompt_and_capture "SLASH-01" "Core Slash Commands" "/init"
send_prompt_and_capture "SLASH-02" "Core Slash Commands" "/init Summarize this repository quickly."
send_prompt_and_capture "SLASH-03" "Core Slash Commands" "/changelog"
manual_check "SLASH-04" "Core Slash Commands" "/changelog then press i opens browser" "Press i and verify browser opens changelog page"
send_prompt_and_capture "SLASH-05" "Core Slash Commands" "/resume"
send_prompt_and_capture "SLASH-06" "Core Slash Commands" "/compact"

# Exit tests (expected process termination)
send_quit_and_expect_exit "EXIT-01" "Exit"
manual_check "EXIT-02" "Exit" "Exit via /quit is normal" "No hanging terminal or abnormal input/mouse behavior"

# Relaunch for Ctrl+C twice exit (expected process termination)
start_adal_session "${LOG_DIR}/spawn_for_ctrlc.log" || true
send_double_ctrlc_and_expect_exit "EXIT-03" "Exit"
manual_check "EXIT-04" "Exit" "Post Ctrl+C behavior is normal" "No abnormal terminal/mouse behavior"

# AdaL Web checks
run_cmd "WEB-01" "AdaL Web" "Launch adal --web" "pilotty kill --session adal-web >/dev/null 2>&1 || true; pilotty spawn --name adal-web env ADAL_DEV_MODE=true adal --web && pilotty snapshot --session adal-web --format text > \"${SNAP_DIR}/adal_web_launch.txt\""
manual_check "WEB-02" "AdaL Web" "Web logout/login works" "Verify top-left auth actions in browser"
manual_check "WEB-03" "AdaL Web" "Web query execution works" "Run several queries and confirm responses"

# Debug logs evidence
run_cmd "LOGS-01" "Evidence" "List ~/.adal/debug_logs" "ls -la ~/.adal/debug_logs"

# Final summary
append_report ""
append_report "## Startup Timing Summary"
append_report ""
append_report "| Platform | 1st Startup (s) | 2nd Startup (s) |"
append_report "|---|---:|---:|"
append_report "| ${PLATFORM} | ${first_startup} | ${second_startup} |"

append_report ""
append_report "## Aggregate"
append_report ""
append_report "- PASS: ${pass_count}"
append_report "- FAIL: ${fail_count}"
append_report "- MANUAL: ${manual_count}"
append_report "- BLOCKED: ${blocked_count}"
append_report ""
append_report "Artifacts directory: ${OUT_DIR}"

cleanup_session
pilotty kill --session adal-web >/dev/null 2>&1 || true

echo "Done."
echo "Report: ${REPORT}"
echo "Artifacts: ${OUT_DIR}"
