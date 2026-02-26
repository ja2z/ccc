#!/usr/bin/env bash
# Stop the Commerce Control Center server
cd "$(dirname "$0")/.."
pkill -f "node dist/server.js" 2>/dev/null && echo "Server stopped." || echo "No server process found."
