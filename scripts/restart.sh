#!/usr/bin/env bash
# scripts/restart.sh — Restart Buddy Reroller server
cd "$(dirname "$0")"

bash stop.sh
sleep 1
bash start.sh
