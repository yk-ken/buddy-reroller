#!/usr/bin/env bash
# scripts/stop.sh — Stop Buddy Reroller server
PORT=17840

# Find PID listening on the port
PID=$(netstat -ano 2>/dev/null | grep ":$PORT .*LISTENING" | awk '{print $5}' | head -1)

if [ -z "$PID" ]; then
  echo "Buddy Reroller is not running."
  exit 0
fi

echo "Stopping Buddy Reroller (PID: $PID)..."
taskkill //PID "$PID" //F 2>/dev/null
echo "Stopped."
