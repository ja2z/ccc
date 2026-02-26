#!/usr/bin/env bash
# Restart the Commerce Control Center server
cd "$(dirname "$0")/.."
pkill -f "node dist/server.js" 2>/dev/null || true
sleep 1
npm run build
npm start
