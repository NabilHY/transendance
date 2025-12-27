#!/bin/sh
set -e

echo "🚀 Starting frontend service..."

# Prevent writing lockfile into bind-mounted source
export NPM_CONFIG_PACKAGE_LOCK=false

# Install deps only when needed (node_modules is a Docker volume in compose)
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "📦 Installing dependencies..."
  npm install --no-package-lock
fi

# Clear .next cache if it exists to ensure fresh hot reload
if [ -d .next ]; then
  echo "🧹 Clearing .next cache for fresh hot reload..."
  rm -rf .next
fi

# Default to development mode for hot reload unless explicitly set to production
# This ensures hot reload works by default
if [ "${NODE_ENV}" = "production" ] && [ "${ENABLE_HOT_RELOAD}" != "true" ]; then
  echo "📦 Building and starting in production mode..."
  npm run build
  npm run start
else
  # Start in dev mode with hot reload enabled
  # This works even if NODE_ENV=production but ENABLE_HOT_RELOAD=true
  echo "🔥 Starting in development mode with hot reload..."
  echo "📡 Next.js will listen on 0.0.0.0:${FRONTEND_PORT:-3010}"
  echo "👀 File watching enabled with polling (checks every 1 second)"
  # Ensure NODE_ENV is set to development for hot reload to work properly
  export NODE_ENV=development
  # Enable webpack polling explicitly
  export WATCHPACK_POLLING=true
  # Enable Chokidar polling (used by Next.js for file watching)
  export CHOKIDAR_USEPOLLING=true
  export CHOKIDAR_INTERVAL=1000
  # Enable Next.js turbo mode for faster rebuilds (optional but helpful)
  export NEXT_TELEMETRY_DISABLED=1
  npm run dev
fi

