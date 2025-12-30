# Makefile for ft_transendance_42 project
# Docker Compose commands for managing microservices (auth-backend, usr-manag, frontend)

ENV ?= dev

# Select compose file based on environment
COMPOSE_FILE = $(if $(filter prod,$(ENV)),docker-compose.prod.yml,docker-compose.yml)


COMPOSE = docker compose -f $(COMPOSE_FILE)

# Volumes :
VOLUMES_DIR=/home/${USER}/transendance_volumes
ENV_FILE=.env
users_db_dir=${VOLUMES_DIR}/users_db
auth-backend-node_modules_dir=${VOLUMES_DIR}/auth-backend-node_modules
usr-manag-node_modules_dir=${VOLUMES_DIR}/usr-manag-node_modules
frontend-node_modules_dir=${VOLUMES_DIR}/frontend-node_modules
db-init-node_modules_dir=${VOLUMES_DIR}/db-init-node_modules

.PHONY: help setup setup-full init build up down restart logs ps clean rebuild install-deps test smoke-test dev prod prod-build prod-up prod-down prod-logs prod-restart prod-ngrok prod-ngrok-down build-prod

# Default target - dev mode
.DEFAULT_GOAL := dev

help:
	@echo "Available commands:"
	@echo "  setup       - Quick environment setup for development"
	@echo "  setup-full  - Interactive environment setup"
	@echo "  build       - Build all services (use env=prod for production)"
	@echo "  up          - Start all services in detached mode (use env=prod for production)"
	@echo "  down        - Stop and remove all services"
	@echo "  restart     - Restart all services"
	@echo "  logs        - Show logs from all services"
	@echo "  ps          - Show running containers"
	@echo "  clean       - Stop and remove all containers, networks, and volumes"
	@echo "  rebuild     - Clean and rebuild all services"
	@echo "  install-deps - Install dependencies (for local development)"
	@echo "  test        - Run smoke tests to verify endpoints"
	@echo "  init        - Complete setup (env + deps + build + start)"
	@echo "  dev         - Start all services in dev mode and show logs (default)"
	@echo ""
	@echo "Production commands:"
	@echo "  prod        - Build and start all services in production mode"
	@echo "  prod-build  - Build all services in production mode"
	@echo "  prod-up     - Start all services in production mode"
	@echo "  prod-down   - Stop all services in production mode"
	@echo "  prod-logs   - Show logs from all production services"
	@echo "  prod-restart - Restart all services in production mode"
	@echo ""
	@echo "Note: make prod includes ngrok tunnel (always started)"
	@echo ""
	@echo "Environment:"
	@echo "  env=dev     - Use development compose file (default)"
	@echo "  env=prod    - Use production compose file"
	@echo ""
	@echo "Examples:"
	@echo "  make              - Start dev mode (default)"
	@echo "  make build        - Build with dev compose file"
	@echo "  make prod         - Build and start in production mode"
	@echo "  make prod-up      - Start production services"
	@echo "  make env=prod build - Alternative: Build with prod compose file"

${users_db_dir}:
	mkdir -p ${users_db_dir}

# Build commands
build:
	$(COMPOSE) build --no-cache

# Start commands
up: ${users_db_dir}
	$(COMPOSE) up -d

# Stop commands
down:
	$(COMPOSE) down

# Restart commands
restart:
	$(COMPOSE) restart

# Log commands
logs:
	$(COMPOSE) logs -f

# Status commands
ps:
	$(COMPOSE) ps

# Clean commands
clean:
	$(COMPOSE) down -v --remove-orphans
	docker system prune -f
	
prod: 
	docker compose -f docker-compose.prod.yml build --no-cache
	docker compose -f docker-compose.prod.yml up -d
# Rebuild commands
rebuild: clean build up

# Development commands
install-deps:
	@echo "Installing auth-backend dependencies..."
	cd auth-backend && npm install
	@echo "Installing usr-manag dependencies..."
	cd usr-manag && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Smoke test commands
test:
	@echo "Running smoke tests..."
	@echo "Testing auth-backend health..."
	@curl -s http://localhost:8005/health > /dev/null && echo "✓ Auth-backend health endpoint working" || echo "✗ Auth-backend health endpoint failed"
	@echo "Testing usr-manag health..."
	@curl -s http://localhost:4000/health > /dev/null && echo "✓ Usr-manag health endpoint working" || echo "✗ Usr-manag health endpoint failed"
	@echo "Testing frontend..."
	@curl -s http://localhost:8080 > /dev/null && echo "✓ Frontend endpoint working" || echo "✗ Frontend endpoint failed"

# Complete setup commands
init: setup install-deps build up
	@echo "✅ Complete setup finished!"
	@echo "🚀 Access the application at: http://localhost:8080"

# Quick development commands
dev: build up logs
	@echo "✅ Development services built and started!"

# Production commands
prod: prod-build prod-up
	@echo "✅ Production services built and started!"
	@echo "🚀 Production mode is active"
	@echo "📡 Ngrok tunnel is starting (check logs with: make prod-logs | grep ngrok)"

prod-build:
	@echo "🔨 Building production services..."
	docker compose -f docker-compose.prod.yml build --no-cache

# Build only production compose file (without starting)
build-prod:
	@echo "🔨 Building docker-compose.prod.yml services..."
	docker compose -f docker-compose.prod.yml build --no-cache

prod-up:
	@echo "🚀 Starting production services..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started!"

prod-down:
	@echo "🛑 Stopping production services..."
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-restart:
	@echo "🔄 Restarting production services..."
	docker compose -f docker-compose.prod.yml restart

# Production with ngrok tunnel
prod-ngrok: prod-build
	@if [ -z "$$NGROK_AUTHTOKEN" ]; then \
		echo "❌ Error: NGROK_AUTHTOKEN environment variable is not set"; \
		echo "Please set it in your .env file or export it:"; \
		echo "  export NGROK_AUTHTOKEN=your-token-here"; \
		exit 1; \
	fi
	@echo "🚀 Starting production services with ngrok..."
	docker compose -f docker-compose.prod.yml --profile ngrok up -d
	@echo "✅ Production services with ngrok started!"

prod-ngrok-down:
	@echo "🛑 Stopping production services with ngrok..."
	docker compose -f docker-compose.prod.yml --profile ngrok down

# Database commands
db-backup:
	@echo "Backing up auth-backend database..."
	$(COMPOSE) exec auth-backend sqlite3 /usr/src/app/db/sqlite.db ".backup /usr/src/app/db/backup_$(shell date +%Y%m%d_%H%M%S).db"
	@echo "Backing up usr-manag database..."
	$(COMPOSE) exec usr-manag sqlite3 /usr/src/app/data/database.sqlite ".backup /usr/src/app/data/backup_$(shell date +%Y%m%d_%H%M%S).db"

# Service-specific commands
backend-shell:
	$(COMPOSE) exec auth-backend /bin/bash

usr-manag-shell:
	$(COMPOSE) exec usr-manag /bin/sh

frontend-shell:
	$(COMPOSE) exec frontend /bin/sh

# Monitoring commands
stats:
	docker stats

# Environment commands
env:
	@echo "Auth-backend environment:"
	@$(COMPOSE) exec auth-backend env | grep -E "(NODE_ENV|JWT|DB)" || echo "No environment variables found"
	@echo "Usr-manag environment:"
	@$(COMPOSE) exec usr-manag env | grep -E "(NODE_ENV|AUTH_SERVICE_URL|DATABASE_PATH)" || echo "No environment variables found"
	@echo "Frontend environment:"
	@$(COMPOSE) exec frontend env | grep -E "(NODE_ENV|API)" || echo "No environment variables found"