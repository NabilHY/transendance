#!/bin/sh
set -e

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Install deps only when needed (node_modules is a Docker volume in compose)
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  if [ "${NODE_ENV}" = "production" ]; then
    npm install --no-package-lock --legacy-peer-deps --omit=dev
  else
    npm install --no-package-lock --legacy-peer-deps
  fi
fi

# Rebuild native deps if needed (sqlite3)
npm rebuild sqlite3 --build-from-source || true

if [ "${NODE_ENV}" = "production" ]; then
  npm run start
else
  # Start in dev mode for hot reload
  npm run dev
fi