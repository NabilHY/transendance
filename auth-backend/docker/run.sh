#!/bin/sh
set -e

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Clean install to ensure native modules match container libc
# If node_modules is a mounted volume, removing the directory can fail (busy). Clear contents instead.
rm -f package-lock.json || true
mkdir -p node_modules
sh -lc 'find node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} +' || true
npm install --no-package-lock

# Rebuild native deps if needed (sqlite3)
npm rebuild sqlite3 --build-from-source || true

# Start in dev mode for hot reload
npm run dev