#!/bin/sh
set -e

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Ensure database directory exists
mkdir -p /usr/src/app/db

# Clean install to ensure container-compatible modules (safe if already installed)
rm -rf node_modules package-lock.json
npm install --production --no-package-lock || true

# Start the database service
npm start