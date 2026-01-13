# Transendance Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture Pattern](#architecture-pattern)
3. [System Architecture](#system-architecture)
4. [Microservices](#microservices)
5. [Communication Patterns](#communication-patterns)
6. [Data Architecture](#data-architecture)
7. [Security Architecture](#security-architecture)
8. [Infrastructure & DevOps](#infrastructure--devops)
9. [Deployment](#deployment)
10. [Development Workflow](#development-workflow)

---

## Overview

**Transendance** is a real-time multiplayer Pong game platform built with a microservices architecture. The system provides user authentication, profile management, real-time chat, competitive gaming, and comprehensive monitoring.

### Key Features

- **User Authentication & Authorization**: JWT-based auth with 2FA support
- **Real-time Gaming**: WebSocket-based Pong game with AI opponents
- **Social Features**: Chat, friends, notifications
- **User Profiles**: Customizable profiles with progression/ranking
- **Monitoring**: Prometheus/Grafana metrics and alerting

---

## Architecture Pattern

### Microservices Architecture

The system follows a **microservices architecture** pattern where:

- Each service is **loosely coupled** and **independently deployable**
- Services communicate via **REST APIs** and **WebSockets**
- Each service has a **single, well-defined responsibility**
- Services share a **unified database** (SQLite with WAL mode for concurrent access)

### Benefits

- **Scalability**: Individual services can be scaled independently
- **Maintainability**: Clear separation of concerns
- **Technology Flexibility**: Each service can use appropriate tech stack
- **Fault Isolation**: Failures in one service don't cascade

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│                    (Next.js Frontend)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/WSS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                       │
│              (Load Balancer / SSL Termination)               │
│                                                              │
│  Routes:                                                    │
│  - /              → Frontend                                │
│  - /api/auth/     → Auth Backend                            │
│  - /api/users/    → User Management                         │
│  - /api/chat/ws   → Chat Service (WebSocket)                │
│  - /api/game/ws   → Game Backend (WebSocket)                │
│  - /api/media/    → MinIO (Object Storage)                  │
└─────┬──────┬──────┬──────┬──────┬──────┬───────────────────┘
      │      │      │      │      │      │
      ▼      ▼      ▼      ▼      ▼      ▼
┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────────┐ ┌─────────┐
│ Frontend │ │   Auth   │ │ User │ │   Chat   │ │  Game   │
│ Service  │ │ Backend  │ │ Mgmt │ │ Service  │ │ Backend │
└────┬─────┘ └────┬─────┘ └───┬──┘ └────┬─────┘ └────┬────┘
     │            │            │         │            │
     └────────────┴────────────┴─────────┴────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Shared Database │
                    │   (SQLite WAL)   │
                    └──────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
     ▼                        ▼                        ▼
┌──────────┐          ┌──────────────┐          ┌──────────┐
│  MinIO   │          │  Prometheus  │          │ Mailpit  │
│  (S3)    │          │   + Grafana  │          │  (SMTP)  │
└──────────┘          └──────────────┘          └──────────┘
```

---

## Microservices

### 1. Frontend Service (Next.js)

**Port**: `3010`  
**Technology**: Next.js 14, React, TypeScript

**Responsibilities**:
- User interface rendering
- Client-side routing
- API request orchestration
- Real-time UI updates via WebSocket connections

**Key Features**:
- Server-Side Rendering (SSR)
- Client-side state management (React Context)
- Protected routes with middleware
- Real-time game rendering with Canvas API

---

### 2. Auth Backend

**Port**: `8005`  
**Technology**: Node.js, Fastify

**Responsibilities**:
- User authentication and authorization
- JWT token management (access + refresh tokens)
- Two-Factor Authentication (2FA/TOTP)
- Password management (hashing, reset)
- Email verification
- OAuth (Google) integration
- Account security (lockout, rate limiting)

**Key Endpoints**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/login/2fa` - 2FA verification
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/verify-email/confirm` - Email verification
- `POST /api/auth/service-auth` - Inter-service authentication

**Security Features**:
- bcrypt password hashing (10 rounds)
- CSRF protection
- XSS sanitization
- Input validation (JSON schemas)
- Rate limiting
- Account lockout

---

### 3. User Management Service (usr-manag)

**Port**: `4000`  
**Technology**: Node.js, Fastify

**Responsibilities**:
- User profile management
- Friend system (requests, accept, reject, block)
- Online status tracking
- User search and directory
- Avatar/Media management (MinIO integration)
- Notifications (WebSocket)

**Key Endpoints**:
- `GET /users` - List users with pagination/filtering
- `GET /users/:id` - Get user profile
- `PATCH /me/profile` - Update own profile
- `POST /users/:id/friends/invitation` - Send friend request
- `GET /me/friends` - Get friends list
- `GET /notifications/ws` - WebSocket for notifications

**Features**:
- Profile completion tracking
- Avatar upload via MinIO (S3-compatible)
- Real-time notifications via WebSocket
- Friend relationship management

---

### 4. Chat Service

**Port**: `8006`  
**Technology**: Node.js, Fastify, WebSocket

**Responsibilities**:
- Real-time messaging
- Direct messages (1-to-1)
- Group channels
- Message history
- Block management

**Key Endpoints**:
- `GET /ws` - WebSocket connection for chat
- Message routing and delivery
- Channel management

**Features**:
- WebSocket-based real-time communication
- Message persistence
- Block user functionality
- Private/public channels

---

### 5. Game Backend

**Port**: `4322`  
**Technology**: Node.js, Fastify, WebSocket

**Responsibilities**:
- Pong game logic and physics
- Real-time game state synchronization
- AI opponent implementation
- Game statistics tracking
- Tournament management
- Player progression (XP, levels, ranks)

**Key Endpoints**:
- `GET /ws` - WebSocket connection for game
- Game state management
- Player authentication for game sessions

**Game Features**:
- Classic Pong (2-player)
- Quad Pong (4-player)
- AI opponents (multiple difficulty levels)
- Tournament mode
- Real-time physics simulation
- Win/loss statistics

**AI Implementation**:
- Multiple AI types (original, subject-compliant)
- Configurable difficulty levels
- Predictable behavior for testing

---

### 6. Database Initialization Service (db-init)

**Port**: `3005`  
**Technology**: Node.js

**Responsibilities**:
- Database schema initialization
- Migration management
- Database health checks

**Key Features**:
- Unified database schema creation
- Foreign key constraints
- WAL (Write-Ahead Logging) mode for concurrent access
- Table migrations

---

### Supporting Services

#### NGINX (Gateway)

**Ports**: `80` (HTTP), `443` (HTTPS)

**Responsibilities**:
- Reverse proxy and load balancing
- SSL/TLS termination
- Request routing
- WebSocket proxy (upgrade handling)

**Routing Configuration**:
- `/` → Frontend (Next.js)
- `/api/auth/*` → Auth Backend
- `/api/users/*` → User Management
- `/api/chat/ws` → Chat Service (WebSocket)
- `/api/game/ws` → Game Backend (WebSocket)
- `/api/media/*` → MinIO (Object Storage)
- `/email` → Mailpit (Email UI)

#### MinIO (Object Storage)

**Port**: `9000` (API), `9002` (Console)

**Responsibilities**:
- S3-compatible object storage
- Avatar/image storage
- Presigned URL generation for secure access

#### Mailpit (Email Testing)

**Port**: `8025` (UI), `1025` (SMTP)

**Responsibilities**:
- Email capture for development
- Email UI for testing
- SMTP server simulation

#### Ngrok (Tunneling)

**Port**: Dynamic

**Responsibilities**:
- HTTP tunnel for external access
- Public URL generation
- Development/testing access

---

## Communication Patterns

### HTTP/REST Communication

**Pattern**: Synchronous request-response

**Used For**:
- Authentication flows
- Profile management
- User directory queries
- API operations

**Example Flow**:
```
Frontend → NGINX → Auth Backend → Database
         (HTTPS)   (HTTP internal)
```

### WebSocket Communication

**Pattern**: Persistent bidirectional connection

**Used For**:
- Real-time chat messages
- Game state synchronization
- Live notifications

**Services Using WebSocket**:
1. **Chat Service** (`/api/chat/ws`)
   - Message broadcasting
   - Presence updates
   - Real-time delivery

2. **Game Backend** (`/api/game/ws`)
   - Game state updates (60fps)
   - Player input handling
   - Score synchronization

3. **User Management** (`/notifications/ws`)
   - Friend request notifications
   - Game invitations
   - System notifications

**WebSocket Authentication**:
- JWT token passed in URL parameter or Authorization header
- Token validated on connection establishment
- Connection rejected if token invalid/expired

### Inter-Service Communication

**Pattern**: HTTP with service-to-service authentication

**Used For**:
- Game Backend verifying user tokens with Auth Backend
- Service authentication via `INTERNAL_SERVICE_KEY`

**Example**:
```
Game Backend → Auth Backend (/api/auth/service-auth)
             (HTTP with service key)
```

---

## Data Architecture

### Database: SQLite with WAL Mode

**Shared Database**: All services access the same SQLite database file using Write-Ahead Logging (WAL) mode for concurrent reads/writes.

**Location**: `/usr/src/app/db/shared.sqlite` (mounted as Docker volume)

### Schema Overview

#### Core Tables

**`users`** (Unified User Table)
- Authentication data (email, password_hash, google_id)
- Profile data (username, first_name, last_name, avatar)
- Security (2FA, verification status, account lockout)
- Gaming statistics (level, XP, rank, wins/losses)

**`refresh_tokens`**
- JWT refresh token storage
- Expiration tracking
- Cascade delete on user deletion

**`email_verification_tokens`**
- Email verification tokens
- Expiration management
- Email change tracking

**`password_reset_tokens`**
- Password reset token storage
- One-time use tracking

**`account_lockouts`**
- Failed login attempt tracking
- Lockout expiration

#### Chat Tables

**`messages`**
- Chat message storage
- Channel/message relationships

**`channels`**
- Chat channels (direct/group)
- Privacy settings

**`channel_members`**
- Channel membership
- User-channel relationships

**`blocked_users`**
- User blocking relationships

#### User Management Tables

**`friendships`**
- Friend relationships
- Request status tracking

**`notifications`**
- User notifications
- Read/unread status

### Data Consistency

- **Foreign Keys**: Enabled for referential integrity
- **Transactions**: Used for multi-step operations
- **Cascade Deletes**: Configured for data cleanup
- **WAL Mode**: Enables concurrent access without locking

### Data Flow

```
┌──────────────┐
│   Service    │
│  (Any)       │
└──────┬───────┘
       │ SQL queries
       ▼
┌──────────────┐
│   SQLite     │
│  (WAL Mode)  │
│              │
│ - Concurrent │
│   reads      │
│ - Sequential │
│   writes     │
└──────────────┘
```

---

## Security Architecture

### Authentication & Authorization

#### JWT (JSON Web Tokens)

**Token Types**:
1. **Access Token** (short-lived, 15min default)
   - Stored in HTTP-only cookie
   - Used for API requests
   - Contains: `sub` (user ID), `email`

2. **Refresh Token** (long-lived, 7-30 days)
   - Stored in HTTP-only cookie
   - Used to obtain new access tokens
   - Stored in database for revocation

**Token Flow**:
```
Login → Access Token + Refresh Token
     ↓
API Request → Validate Access Token
     ↓
Token Expired? → Use Refresh Token → New Access Token
```

#### Two-Factor Authentication (2FA)

**Implementation**: TOTP (Time-based One-Time Password)

**Flow**:
1. User enables 2FA → Secret generated
2. QR code displayed → User scans with authenticator app
3. User confirms with code → 2FA enabled
4. Login requires: Password + 6-digit TOTP code

**Storage**: `twofa_secret` in users table (encrypted/encoded)

### Security Measures

#### Password Security

- **Hashing**: bcrypt with 10 salt rounds
- **Policy**: Minimum 12 characters, complexity requirements
- **Validation**: Server-side + client-side

#### Input Validation & Sanitization

- **XSS Protection**: `xss` library for input sanitization
- **SQL Injection Protection**: Parameterized queries (prepared statements)
- **Validation**: JSON schema validation on all endpoints
- **CSRF Protection**: Token-based CSRF protection for state-changing operations

#### Network Security

- **HTTPS/WSS**: All production traffic encrypted
- **SSL/TLS**: Modern protocols (TLS 1.2, 1.3)
- **Security Headers**:
  - HSTS (HTTP Strict Transport Security)
  - X-Frame-Options
  - X-Content-Type-Options
  - Content-Security-Policy

#### Rate Limiting

- **Login Attempts**: Account lockout after failed attempts
- **API Endpoints**: Rate limiting on sensitive operations
- **IP-based**: Blocking repeated offenders

#### Service-to-Service Security

- **Service Keys**: Internal services authenticate with shared secret
- **Token Validation**: Services validate JWT tokens independently
- **Network Isolation**: Services on private Docker network

### Credentials Management

- **Environment Variables**: All secrets in `.env` files
- **Git Ignored**: `.env*` files excluded from version control
- **Docker Secrets**: Environment variables injected at runtime

---

## Infrastructure & DevOps

### Container Orchestration

**Platform**: Docker Compose

**Networks**:
- `ft_transendance`: Bridge network for all services
- Isolated from host, services communicate via service names

**Volumes**:
- `users_data`: Shared database volume
- `grafana_data`: Grafana persistent data
- `prometheus_data`: Prometheus metrics storage
- `minio_data`: Object storage data
- `alertmanager_data`: Alertmanager state

### Monitoring Stack

#### Prometheus

**Port**: `9090`

**Responsibilities**:
- Metrics collection from all services
- Time-series database
- Alert rule evaluation

**Scraped Targets**:
- `auth-backend:8005/metrics`
- `usr-manag:4000/metrics`
- `chat:8006/metrics`
- `game-backend:4322/metrics`
- `frontend:3010/metrics`
- `nginx-exporter:9113` (nginx metrics)
- `node-exporter:9100` (system metrics)
- `cadvisor:8080` (container metrics)
- `minio:9000/minio/v2/metrics/cluster`

**Metrics Collected**:
- HTTP request counts, durations, errors
- Database query performance
- WebSocket connections
- Memory/CPU usage
- Custom business metrics

#### Grafana

**Port**: `4010` (localhost only)

**Responsibilities**:
- Metrics visualization
- Dashboard creation
- Alerting UI

**Features**:
- Pre-provisioned dashboards
- Prometheus data source
- Secure authentication required

#### Alertmanager

**Port**: `9093`

**Responsibilities**:
- Alert routing and grouping
- Notification delivery (email, webhook)
- Alert silencing

**Configuration**:
- Alert rules defined in `prometheus/alerts.yml`
- Email notifications via SendGrid SMTP

#### Node Exporter

**Port**: `9100`

**Responsibilities**:
- System-level metrics (CPU, memory, disk, network)

#### cAdvisor

**Port**: `8080`

**Responsibilities**:
- Container-level metrics (per-container resource usage)

#### Nginx Exporter

**Port**: `9113`

**Responsibilities**:
- Nginx metrics (request rates, response times, status codes)

### Health Checks

All services implement health check endpoints:

- **Path**: `/health`
- **Response**: JSON with service status
- **Used By**: Docker Compose for dependency management

**Example**:
```json
{
  "status": "ok",
  "service": "auth-backend",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Logging

**Current Setup**:
- Console logging to stdout/stderr
- Docker captures and aggregates logs
- View via: `docker compose logs -f [service]`

---

## Deployment

### Development Mode

**Command**: `make` or `make dev`

**Features**:
- Hot reload enabled
- Development compose file
- Direct service access on ports
- Debug logging enabled

### Production Mode

**Command**: `make prod`

**Features**:
- Optimized builds
- Production compose file
- NGINX reverse proxy
- SSL/TLS enabled
- Monitoring enabled
- Ngrok tunnel (optional)

### Docker Compose Files

1. **`docker-compose.yml`**: Development configuration
2. **`docker-compose.prod.yml`**: Production configuration

**Key Differences**:
- Production includes monitoring stack
- Production uses NGINX as gateway
- Production has stricter security settings
- Production volumes for persistence

### Build Process

```bash
# Build all services
make prod-build

# Start all services
make prod-up

# Or combined
make prod
```

### Environment Variables

**Required Variables** (`.env.prod`):
- `JWT_SECRET`: JWT signing secret
- `JWT_ACCESS_EXPIRES_IN`: Access token expiry
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiry
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret
- `FRONTEND_URL`: Frontend base URL
- `NGROK_AUTHTOKEN`: Ngrok tunnel token (optional)
- `MINIO_ROOT_USER`: MinIO admin user
- `MINIO_ROOT_PASSWORD`: MinIO admin password

---

## Development Workflow

### Project Structure

```
transendance/
├── auth-backend/          # Authentication service
├── usr-manag/             # User management service
├── chat/                  # Chat service
├── game-backend/          # Game service
├── frontend/              # Next.js frontend
├── db-init/               # Database initialization
├── nginx/                 # Reverse proxy config
├── monitoring/            # Prometheus/Grafana configs
├── docker-compose.yml     # Dev environment
├── docker-compose.prod.yml # Prod environment
└── Makefile               # Build/deploy commands
```

### Service Dependencies

```
db-init (must start first)
  ↓
auth-backend, usr-manag, game-backend, chat (depends on db-init)
  ↓
frontend (depends on auth-backend, usr-manag)
  ↓
nginx (depends on all services)
```

### Local Development

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with required variables
   ```

2. **Install Dependencies**:
   ```bash
   make install-deps
   ```

3. **Start Services**:
   ```bash
   make dev
   ```

4. **Access Services**:
   - Frontend: http://localhost:3010
   - Auth API: http://localhost:8005
   - User Mgmt: http://localhost:4000
   - Game Backend: http://localhost:4322
   - Chat: http://localhost:8006

### Testing

**Smoke Tests**:
```bash
make test
```

Tests health endpoints of all services.

### Service Development

Each service follows a consistent structure:

```
service-name/
├── src/server.js      # Main entry point
├── routes/            # API routes
├── plugins/           # Fastify plugins
├── utils/             # Utility functions
├── config.js          # Configuration
├── Dockerfile         # Container definition
└── package.json       # Dependencies
```

### Adding a New Service

1. Create service directory
2. Implement Fastify server with health endpoint
3. Add to `docker-compose.yml` and `docker-compose.prod.yml`
4. Configure NGINX routing if needed
5. Add metrics endpoint for Prometheus
6. Update Makefile if needed

---

## Data Flow Examples

### User Registration Flow

```
1. Frontend: POST /api/auth/register
   ↓
2. NGINX: Route to auth-backend
   ↓
3. Auth Backend:
   - Validate input (email, password)
   - Hash password (bcrypt)
   - Create user in database
   - Generate email verification token
   - Send verification email via Mailpit
   ↓
4. Response: 201 Created
   ↓
5. Frontend: Show "Check your email" message
```

### Login Flow (with 2FA)

```
1. Frontend: POST /api/auth/login { email, password }
   ↓
2. Auth Backend:
   - Verify password
   - Check if 2FA enabled
   ↓
3a. If 2FA disabled:
    - Generate access + refresh tokens
    - Set cookies
    - Return success
   
3b. If 2FA enabled:
    - Generate pre-2FA token
    - Return: requires2FA: true
   ↓
4. Frontend: Redirect to /twofa
   ↓
5. User: Enters 6-digit code
   ↓
6. Frontend: POST /api/auth/login/2fa { token }
   ↓
7. Auth Backend:
   - Verify TOTP code
   - Generate access + refresh tokens
   - Set cookies
   ↓
8. Frontend: Redirect to home
```

### Game Start Flow

```
1. Frontend: User clicks "Play Game"
   ↓
2. Frontend: Connect to /api/game/ws?token={jwt}
   ↓
3. Game Backend:
   - Validate JWT token
   - Get user from database
   - Create game session
   ↓
4. WebSocket: Connection established
   ↓
5. Game Backend: Send initial game state
   ↓
6. Frontend: Render game canvas
   ↓
7. Game Loop (60fps):
   - Frontend: Send player input
   - Backend: Update physics
   - Backend: Broadcast state to all players
   - Frontend: Render new state
   ↓
8. Game End:
   - Backend: Calculate statistics
   - Backend: Update database (wins, XP, rank)
   - Backend: Send game result
   ↓
9. Frontend: Show win/loss screen
```

### Real-time Chat Flow

```
1. User A: Types message
   ↓
2. Frontend: Send via WebSocket
   ↓
3. Chat Service:
   - Validate sender authentication
   - Check if receiver is blocked
   - Store message in database
   - Broadcast to receiver (if online)
   ↓
4. User B: Receives message via WebSocket
   ↓
5. Frontend: Display message in chat UI
```

---

## Performance Considerations

### Database

- **WAL Mode**: Enables concurrent reads without blocking
- **Indexes**: Added on frequently queried columns
- **Connection Pooling**: Each service manages its own connections

### Caching

- **JWT Tokens**: Validated without database lookup (for valid tokens)
- **User Profiles**: Could be cached in Redis (future enhancement)

### WebSocket Optimization

- **Game State**: Only send delta changes when possible
- **Message Batching**: Group multiple updates when feasible
- **Connection Pooling**: Reuse WebSocket connections

### Load Balancing

- **NGINX**: Can be extended to multiple service instances
- **Horizontal Scaling**: Services stateless (except database)

---

## Troubleshooting

### Common Issues

1. **Database Locked**:
   - Check if WAL mode is enabled
   - Ensure only one service writes at a time for critical sections

2. **WebSocket Connection Failed**:
   - Verify JWT token is valid
   - Check NGINX WebSocket upgrade headers
   - Verify service is running

3. **Service Won't Start**:
   - Check dependencies (db-init must be healthy)
   - Verify environment variables
   - Check Docker logs: `docker compose logs [service]`

4. **CORS Errors**:
   - Verify NGINX proxy headers
   - Check service CORS configuration

### Debugging

**View Logs**:
```bash
make logs              # All services
make prod-logs         # Production
docker compose logs -f [service-name]
```

**Check Service Status**:
```bash
make ps
docker compose ps
```

**Health Checks**:
```bash
curl http://localhost:8005/health  # Auth backend
curl http://localhost:4000/health  # User management
```

---

## Conclusion

Transendance is built with a modern microservices architecture that provides:

- **Scalability**: Independent service scaling
- **Maintainability**: Clear service boundaries
- **Security**: Comprehensive authentication and authorization
- **Observability**: Full monitoring stack
- **Developer Experience**: Easy local development setup

The architecture supports both development agility and production reliability.

---

**Last Updated**: 2025  
**Version**: 1.0

# meme
