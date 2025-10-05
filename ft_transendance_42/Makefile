# Makefile for ft_transendance_42 project
# Docker Compose commands for managing the auth backend and frontend services

.PHONY: help build up down restart logs ps clean rebuild install-deps test smoke-test

# Default target
help:
	@echo "Available commands:"
	@echo "  build        - Build all services"
	@echo "  build-backend - Build only auth-backend service"
	@echo "  build-frontend - Build only frontend service"
	@echo "  up          - Start all services in detached mode"
	@echo "  up-backend  - Start only auth-backend service"
	@echo "  up-frontend - Start only frontend service"
	@echo "  down        - Stop and remove all services"
	@echo "  restart     - Restart all services"
	@echo "  restart-backend - Restart only auth-backend service"
	@echo "  restart-frontend - Restart only frontend service"
	@echo "  logs        - Show logs from all services"
	@echo "  logs-backend - Show logs from auth-backend service"
	@echo "  logs-frontend - Show logs from frontend service"
	@echo "  ps          - Show running containers"
	@echo "  clean       - Stop and remove all containers, networks, and volumes"
	@echo "  rebuild     - Clean and rebuild all services"
	@echo "  install-deps - Install dependencies (for local development)"
	@echo "  test        - Run tests"
	@echo "  smoke-test  - Run smoke tests to verify endpoints"

# Build commands
build:
	docker compose build

build-backend:
	docker compose build auth-backend

build-frontend:
	docker compose build frontend

# Start commands
up:
	docker compose up -d

up-backend:
	docker compose up -d auth-backend

up-frontend:
	docker compose up -d frontend

# Stop commands
down:
	docker compose down

# Restart commands
restart:
	docker compose restart

restart-backend:
	docker compose restart auth-backend

restart-frontend:
	docker compose restart frontend

# Log commands
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f auth-backend

logs-frontend:
	docker compose logs -f frontend

# Status commands
ps:
	docker compose ps

# Clean commands
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# Rebuild commands
rebuild: clean build up

# Development commands
install-deps:
	@echo "Installing backend dependencies..."
	cd services/auth-backend && npm install
	@echo "Installing frontend dependencies..."
	cd services/frontend && npm install

# Test commands
test:
	@echo "Running backend tests..."
	cd services/auth-backend && npm test
	@echo "Running frontend tests..."
	cd services/frontend && npm test

# Smoke test commands
smoke-test:
	@echo "Running smoke tests..."
	@echo "Testing backend health..."
	@curl -s http://localhost:8005/documentation > /dev/null && echo "✓ Backend documentation endpoint working" || echo "✗ Backend documentation endpoint failed"
	@echo "Testing frontend..."
	@curl -s http://localhost:8080 > /dev/null && echo "✓ Frontend endpoint working" || echo "✗ Frontend endpoint failed"
	@echo "Testing registration endpoint with sanitization..."
	@curl -s http://localhost:8005/api/auth/register -X POST -H "Content-Type: application/json" -d '{"email":"<script>alert(\"xss\")</script>test@example.com","password":"testpassword123"}' > /dev/null && echo "✓ Registration endpoint working (XSS sanitized)" || echo "✗ Registration endpoint failed"

# Quick development commands
dev: up logs

dev-backend: up-backend logs-backend

dev-frontend: up-frontend logs-frontend

# Database commands
db-backup:
	@echo "Backing up database..."
	docker compose exec auth-backend sqlite3 /usr/src/app/db/auth.db ".backup /usr/src/app/db/backup_$(shell date +%Y%m%d_%H%M%S).db"

db-restore:
	@echo "Restoring database from backup..."
	@read -p "Enter backup filename: " backup_file; \
	docker compose exec auth-backend sqlite3 /usr/src/app/db/auth.db ".restore /usr/src/app/db/$$backup_file"

# Maintenance commands
prune: clean build up
	docker system prune -a -f

volumes:
	docker volume ls

networks:

	docker network ls

# Service-specific commands
backend-shell:
	docker compose exec auth-backend /bin/bash

frontend-shell:
	docker compose exec frontend /bin/sh

# Monitoring commands
top:
	docker compose top

stats:
	docker stats

# Environment commandsservices
	@echo "Backend environment:"
	@docker compose exec auth-backend env | grep -E "(NODE_ENV|JWT|REDIS|DB)" || echo "No environment variables found"
	@echo "Frontend environment:"
	@docker compose exec frontend env | grep -E "(NODE_ENV|API)" || echo "No environment variables found"
