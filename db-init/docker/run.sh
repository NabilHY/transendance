#!/bin/sh
set -e

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Ensure database directory exists
mkdir -p /usr/src/app/db

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "📦 Installing dependencies..."
  npm install --production --no-package-lock || true
  echo "✅ Dependencies installed"
fi

if [ ! -f node_modules/sqlite3/lib/binding/node-v*/node_sqlite3.node ] || \
   ! node -e "require('sqlite3')" 2>/dev/null; then
  echo "🔨 Rebuilding sqlite3 native module..."
  npm rebuild sqlite3 --build-from-source || true
  echo "✅ sqlite3 rebuilt"
else
  echo "✅ sqlite3 native module already built"
fi

# Start the database service
npm start