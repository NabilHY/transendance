#!/bin/bash

# Quick setup script for development environment
# Generates a .env file with sensible defaults for local development

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

echo -e "${BLUE}🚀 Quick setup for ft_transcendence development environment...${NC}"

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "$(date +%s | sha256sum | base64 | head -c 32)"
}

# Generate secrets
JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)

# Generate the .env file with development defaults
cat > "$ENV_FILE" << EOF
# ============================================
# ft_transcendence Development Environment
# Generated on: $(date)
# ============================================

# Environment
NODE_ENV=development

# ============================================
# Service Ports
# ============================================
AUTH_PORT=8005
USR_MANAG_PORT=4000
FRONTEND_PORT=8080

# ============================================
# Service URLs (External Access)
# ============================================
FRONTEND_URL=http://localhost:8080
AUTH_BACKEND_URL=http://localhost:8005
USR_MANAG_URL=http://localhost:4000

# ============================================
# Inter-Service Communication URLs
# ============================================
AUTH_SERVICE_URL=http://auth-backend:8005
USR_MANAG_SERVICE_URL=http://usr-manag:4000

# ============================================
# Database Configuration
# ============================================
DB_FILE=./db/sqlite.db
DATABASE_PATH=./database.sqlite

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# Google OAuth Configuration (Development)
# ============================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8005/api/auth/google/callback

# ============================================
# Email Configuration (Mailpit)
# ============================================
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=user
SMTP_PASSWORD=password
SMTP_FROM=No-Reply <noreply@example.com>
EMAIL_FROM=No-Reply <noreply@example.com>

# ============================================
# Legacy Variables (for backward compatibility)
# ============================================
PORT=8005
BACKEND_URL=http://localhost:8005

# ============================================
# Session Configuration
# ============================================
SESSION_SECRET=$SESSION_SECRET

# ============================================
# Development Notes
# ============================================
# - Auth backend: http://localhost:8005
# - User management: http://localhost:4000
# - Frontend: http://localhost:8080
# - Mailpit SMTP: http://localhost:8025
# - All services use the same JWT secret for token verification
EOF

echo -e "${GREEN}✅ Development .env file generated!${NC}"

# Create service-specific .env files
echo -e "${BLUE}📄 Creating service-specific .env files...${NC}"

# Auth Backend .env
cat > "$PROJECT_ROOT/auth-backend/.env" << EOF
NODE_ENV=development
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=8005
DB_FILE=./db/sqlite.db
SESSION_SECRET=$SESSION_SECRET

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8005/api/auth/google/callback

SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=user
SMTP_PASSWORD=password
EMAIL_FROM=No-Reply <noreply@example.com>

FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:8005
EOF

# User Management .env
cat > "$PROJECT_ROOT/usr-manag/.env" << EOF
NODE_ENV=development
PORT=4000
AUTH_SERVICE_URL=http://auth-backend:8005
DATABASE_PATH=./database.sqlite
FRONTEND_URL=http://localhost:8080
SERVICE_NAME=usr-manag
SERVICE_VERSION=1.0.0
EOF

echo -e "${GREEN}✅ Service-specific .env files created!${NC}"

echo -e "\n${GREEN}🎉 Quick setup complete!${NC}"
echo -e "${BLUE}📋 Generated files:${NC}"
echo -e "   • Unified .env: $ENV_FILE"
echo -e "   • Auth backend .env: $PROJECT_ROOT/auth-backend/.env"
echo -e "   • User management .env: $PROJECT_ROOT/usr-manag/.env"
echo -e "\n${BLUE}🚀 Ready to start development:${NC}"
echo -e "   • Run: make build"
echo -e "   • Run: make up"
echo -e "   • Access: http://localhost:8080"
