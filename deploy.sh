#!/bin/bash
set -euo pipefail

LOG_FILE="./deployment.log"
log_msg() { echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"; }

log_msg "Starting automated Web-ConnectWise configuration sequence..."

# 1. Verify Environment Prereqs
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    log_msg "CRITICAL ERROR: Node.js/npm installation missing from environment path."
    exit 1
fi

cd "$(dirname "$0")"

# 2. Execute Framework Sync
log_msg "Installing server backend production frameworks..."
npm install

# 3. Spin up server as an async background task process
log_msg "Initializing background network relay daemon..."
npm start &
SERVER_PID=$!

# Give the port socket 2 seconds to open
sleep 2

# 4. Launch automated browser instance
log_msg "Spawning automated Chrome support engine tab..."
if command -v google-chrome &> /dev/null; then
    google-chrome "http://localhost:3000" --auto-select-desktop-capture-source="Entire screen" --use-fake-ui-for-media-stream &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser "http://localhost:3000" --auto-select-desktop-capture-source="Entire screen" --use-fake-ui-for-media-stream &
else
    log_msg "WARNING: Chrome/Chromium binary not mapped to local system execution vectors."
fi

log_msg "Automation script tasks completed cleanly. Server process actively retained."
# Keep script alive matching the server lifecycle boundary
wait $SERVER_PID
