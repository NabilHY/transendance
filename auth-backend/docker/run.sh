#!/bin/sh
set -e

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Install fresh deps inside container layer/volume
npm install --no-package-lock

# Start in dev mode for hot reload
npm run dev


