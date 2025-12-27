#!/bin/sh
set -e

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Ensure database directory exists
mkdir -p /usr/src/app/db

# Install deps only when needed (node_modules is a Docker volume in compose)
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  npm install --production --no-package-lock || true
fi

# Rebuild native deps if needed (sqlite3) to match container libc
npm rebuild sqlite3 --build-from-source || true

# Start the database service
npm start