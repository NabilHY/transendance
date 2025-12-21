#!/bin/sh
set -e

echo "🚀 Starting frontend service..."

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Install deps only when needed (node_modules is a Docker volume in compose)
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  npm install --no-package-lock
fi

if [ "${NODE_ENV}" = "production" ]; then
  npm run build
  npm run start
else
  # Start in dev mode
  npm run dev
fi

