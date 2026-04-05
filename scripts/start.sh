#!/usr/bin/env bash
# scripts/start.sh — Start Buddy Reroller server
cd "$(dirname "$0")/.."
PORT=17840

# Check if already running
if netstat -ano 2>/dev/null | grep -q ":$PORT .*LISTENING"; then
  echo "Buddy Reroller is already running on port $PORT"
  netstat -ano | grep ":$PORT .*LISTENING"
  exit 1
fi

echo "Starting Buddy Reroller..."
bun run src/server.ts &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo "URL: http://localhost:$PORT"

# Wait a moment and verify
sleep 2
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "Started successfully."
else
  echo "Failed to start."
  exit 1
fi
