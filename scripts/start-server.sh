#!/usr/bin/env bash
# Start the Commerce Control Center server
cd "$(dirname "$0")/.."
npm run build
npm start
