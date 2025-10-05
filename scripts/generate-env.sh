#!/bin/bash

# Script to generate unified .env file for all microservices
# This script creates a comprehensive .env file that contains all environment variables
# needed by auth-backend, usr-manag, and frontend services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

echo -e "${BLUE}🔧 Generating unified .env file for ft_transcendence microservices...${NC}"

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "$(date +%s | sha256sum | base64 | head -c 32)"
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# Function to prompt for sensitive input (hidden)
prompt_secret() {
    local prompt="$1"
    local value
    
    read -s -p "$prompt: " value
    echo
    echo "$value"
}

echo -e "${YELLOW}📝 Please provide the following configuration details:${NC}"

# Environment
NODE_ENV=$(prompt_with_default "Environment (development/production)" "development")

# Database paths
AUTH_DB_PATH=$(prompt_with_default "Auth database path" "./db/sqlite.db")
USR_MANAG_DB_PATH=$(prompt_with_default "User management database path" "./database.sqlite")

# Ports
AUTH_PORT=$(prompt_with_default "Auth backend port" "8005")
USR_MANAG_PORT=$(prompt_with_default "User management port" "4000")
FRONTEND_PORT=$(prompt_with_default "Frontend port" "8080")

# URLs
FRONTEND_URL=$(prompt_with_default "Frontend URL" "http://localhost:$FRONTEND_PORT")
AUTH_BACKEND_URL=$(prompt_with_default "Auth backend URL" "http://localhost:$AUTH_PORT")
USR_MANAG_URL=$(prompt_with_default "User management URL" "http://localhost:$USR_MANAG_PORT")

# JWT Configuration
JWT_SECRET=$(prompt_secret "JWT Secret (leave empty to auto-generate)")
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(generate_secret)
    echo -e "${GREEN}✓ Auto-generated JWT secret${NC}"
fi

JWT_ACCESS_EXPIRES_IN=$(prompt_with_default "JWT Access Token Expiry" "15m")
JWT_REFRESH_EXPIRES_IN=$(prompt_with_default "JWT Refresh Token Expiry" "7d")

# Google OAuth (optional)
echo -e "\n${YELLOW}🔐 Google OAuth Configuration (optional):${NC}"
GOOGLE_CLIENT_ID=$(prompt_with_default "Google Client ID" "")
GOOGLE_CLIENT_SECRET=$(prompt_with_default "Google Client Secret" "")
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    GOOGLE_REDIRECT_URI=$(prompt_with_default "Google Redirect URI" "$AUTH_BACKEND_URL/api/auth/google/callback")
else
    GOOGLE_REDIRECT_URI=""
fi

# Email Configuration
echo -e "\n${YELLOW}📧 Email Configuration:${NC}"
SMTP_HOST=$(prompt_with_default "SMTP Host" "mailpit")
SMTP_PORT=$(prompt_with_default "SMTP Port" "1025")
SMTP_USER=$(prompt_with_default "SMTP Username" "user")
SMTP_PASSWORD=$(prompt_with_default "SMTP Password" "password")
EMAIL_FROM=$(prompt_with_default "Email From" "No-Reply <noreply@example.com>")

# Service Discovery URLs (for inter-service communication)
AUTH_SERVICE_URL=$(prompt_with_default "Auth service URL for usr-manag" "http://auth-backend:$AUTH_PORT")
USR_MANAG_SERVICE_URL=$(prompt_with_default "User management service URL" "http://usr-manag:$USR_MANAG_PORT")

echo -e "\n${BLUE}📄 Generating .env file...${NC}"

# Generate the .env file
cat > "$ENV_FILE" << EOF
# ============================================
# ft_transcendence Unified Environment Configuration
# Generated on: $(date)
# ============================================

# Environment
NODE_ENV=$NODE_ENV

# ============================================
# Service Ports
# ============================================
AUTH_PORT=$AUTH_PORT
USR_MANAG_PORT=$USR_MANAG_PORT
FRONTEND_PORT=$FRONTEND_PORT

# ============================================
# Service URLs (External Access)
# ============================================
FRONTEND_URL=$FRONTEND_URL
AUTH_BACKEND_URL=$AUTH_BACKEND_URL
USR_MANAG_URL=$USR_MANAG_URL

# ============================================
# Inter-Service Communication URLs
# ============================================
AUTH_SERVICE_URL=$AUTH_SERVICE_URL
USR_MANAG_SERVICE_URL=$USR_MANAG_SERVICE_URL

# ============================================
# Database Configuration
# ============================================
# Auth Backend Database
DB_FILE=$AUTH_DB_PATH

# User Management Database
DATABASE_PATH=$USR_MANAG_DB_PATH

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRES_IN=$JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN=$JWT_REFRESH_EXPIRES_IN

# ============================================
# Google OAuth Configuration
# ============================================
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI

# ============================================
# Email Configuration
# ============================================
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM=$EMAIL_FROM
EMAIL_FROM=$EMAIL_FROM

# ============================================
# Legacy Variables (for backward compatibility)
# ============================================
PORT=$AUTH_PORT
BACKEND_URL=$AUTH_BACKEND_URL

# ============================================
# Session Configuration
# ============================================
SESSION_SECRET=$(generate_secret)

# ============================================
# Development Notes
# ============================================
# - Auth backend runs on port $AUTH_PORT
# - User management runs on port $USR_MANAG_PORT  
# - Frontend runs on port $FRONTEND_PORT
# - Mailpit SMTP server runs on port 1025 (Web UI: 8025)
# - All services use the same JWT secret for token verification
# - Inter-service communication uses Docker service names
EOF

echo -e "${GREEN}✅ Unified .env file generated successfully!${NC}"
echo -e "${BLUE}📁 Location: $ENV_FILE${NC}"

# Create service-specific .env files for backward compatibility
echo -e "\n${BLUE}📄 Creating service-specific .env files...${NC}"

# Auth Backend .env
cat > "$PROJECT_ROOT/auth-backend/.env" << EOF
# Auth Backend Environment Configuration
NODE_ENV=$NODE_ENV
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRES_IN=$JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN=$JWT_REFRESH_EXPIRES_IN
PORT=$AUTH_PORT
DB_FILE=$AUTH_DB_PATH
SESSION_SECRET=$(generate_secret)

GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
EMAIL_FROM=$EMAIL_FROM

FRONTEND_URL=$FRONTEND_URL
BACKEND_URL=$AUTH_BACKEND_URL
EOF

# User Management .env
cat > "$PROJECT_ROOT/usr-manag/.env" << EOF
# User Management Environment Configuration
NODE_ENV=$NODE_ENV
PORT=$USR_MANAG_PORT
AUTH_SERVICE_URL=$AUTH_SERVICE_URL
DATABASE_PATH=$USR_MANAG_DB_PATH
FRONTEND_URL=$FRONTEND_URL
SERVICE_NAME=usr-manag
SERVICE_VERSION=1.0.0
EOF

echo -e "${GREEN}✅ Service-specific .env files created!${NC}"

# Update docker-compose.yml to use the unified .env file
echo -e "\n${BLUE}📄 Updating docker-compose.yml to use unified .env...${NC}"

# Backup original docker-compose.yml
cp "$PROJECT_ROOT/docker-compose.yml" "$PROJECT_ROOT/docker-compose.yml.backup"

# Create updated docker-compose.yml with env_file reference
cat > "$PROJECT_ROOT/docker-compose.yml" << EOF
services:
  auth-backend:
    build: ./auth-backend
    command: npm run dev  
    ports:
      - \${AUTH_PORT:-8005}:\${AUTH_PORT:-8005}
    env_file: .env
    networks:
      - ft_transendance
    volumes:
      - ./auth-backend:/usr/src/app
      - /usr/src/app/node_modules
      - auth_db_data:/usr/src/app/db
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:\${AUTH_PORT:-8005}/health"]
      interval: 5s
      timeout: 3s
      retries: 24

  frontend:
    build: ./frontend
    command: npm run dev
    ports:
      - \${FRONTEND_PORT:-8080}:\${FRONTEND_PORT:-8080}
    networks:
      - ft_transendance
    depends_on:
      auth-backend:
        condition: service_healthy
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025"  # SMTP server port
      - "8025:8025"  # Web UI port
    networks:
      - ft_transendance
    environment:
      - MP_SMTP_AUTH_ACCEPT_ANY=1
      - MP_SMTP_AUTH_ALLOW_INSECURE=1

  usr-manag:
    build: ./usr-manag
    command: npm start
    ports:
      - \${USR_MANAG_PORT:-4000}:\${USR_MANAG_PORT:-4000}
    networks:
      - ft_transendance
    depends_on:
      auth-backend:
        condition: service_healthy
    volumes:
      - ./usr-manag:/usr/src/app
      - /usr/src/app/node_modules
      - usr_manag_db_data:/usr/src/app/data
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:\${USR_MANAG_PORT:-4000}/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  ft_transendance:
    driver: bridge

volumes:
  auth_db_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /home/leetsolutions1337/trancendance_volumes/auth-db
  usr_manag_db_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /home/leetsolutions1337/trancendance_volumes/usr-manag-db
EOF

echo -e "${GREEN}✅ docker-compose.yml updated to use unified .env!${NC}"

echo -e "\n${GREEN}🎉 Environment setup complete!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   • Unified .env file: $ENV_FILE"
echo -e "   • Auth backend .env: $PROJECT_ROOT/auth-backend/.env"
echo -e "   • User management .env: $PROJECT_ROOT/usr-manag/.env"
echo -e "   • Docker compose updated to use unified environment"
echo -e "\n${YELLOW}🚀 Next steps:${NC}"
echo -e "   • Run: make build"
echo -e "   • Run: make up"
echo -e "   • Access services:"
echo -e "     - Frontend: $FRONTEND_URL"
echo -e "     - Auth API: $AUTH_BACKEND_URL"
echo -e "     - User Management API: $USR_MANAG_URL"
echo -e "     - Mailpit: http://localhost:8025"
