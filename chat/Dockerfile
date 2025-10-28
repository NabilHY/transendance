# ------------------------------
# Stage 1: Build
# ------------------------------
FROM node:20-slim AS build

# Set working directory
WORKDIR /usr/src/app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# ------------------------------
# Stage 2: Runtime
# ------------------------------
FROM node:20-slim

WORKDIR /usr/src/app

# Create database directory
RUN mkdir -p /usr/src/app/db

# Copy built app and dependencies from build stage
COPY --from=build /usr/src/app ./

# Expose chat port (default: 4009)
EXPOSE ${CHAT_PORT:-4009}

# Optional healthcheck (uncomment if your app has /health endpoint)
# HEALTHCHECK --interval=10s --timeout=3s --retries=12 \
#   CMD curl -fsS http://localhost:${CHAT_PORT:-4009}/health || exit 1

# Ensure run script is executable
CMD ["sh", "-lc", "chmod +x ./docker/run.sh && ./docker/run.sh"]
