# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip  
- Expo CLI (`npm install -g @expo/cli`)

### Full Stack Setup
```bash
# Navigate to project root
cd /Users/khaled/Desktop/Projekt/Wohnblitzer

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Install ChromeDriver (required for Selenium bot functionality)
# Ubuntu/Debian:
sudo apt-get install chromium-browser chromium-chromedriver
# MacOS:
brew install chromedriver
```

### Running the Application

#### Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Development server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production server  
uvicorn main:app --host 0.0.0.0 --port 8000

# Direct Python execution
python main.py
```

#### Frontend (React Native + Expo)
```bash
# Navigate to frontend directory
cd frontend

# Start Expo development server
npm start

# Run on specific platforms
npm run android    # Run on Android
npm run ios        # Run on iOS  
npm run web        # Run on Web

# Lint frontend code
npm run lint
```

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# API documentation (Swagger)
# Visit: http://localhost:8000/docs

# Test bot functionality (requires JWT token)
curl -X POST http://localhost:8000/api/bot/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
### Testing the Application:

  ./ci-checks.sh
## Einzelne Bereiche testen:
# Nur Backend
   cd backend && ./run_checks.sh
   
   # Nur Frontend  
   cd frontend && npm run lint && npm run format && npm run test
### Code automatisch formatieren:
# Backend
   cd backend && ./format.sh
   
   # Frontend
   cd frontend && npm run format:fix




## Architecture Overview

### High-Level System Design
This is a **full-stack real estate application system** with a React Native frontend and FastAPI backend. The backend includes an apartment application bot system that automates job applications to WBM (housing company) listings. The system evolved from a standalone Selenium bot into a multi-user SaaS platform with a mobile app interface.

### Core Architecture Components

**1. Frontend Layer (React Native + Expo)**
- **Cross-platform mobile app**: iOS, Android, and Web support
- **Expo Router**: File-based navigation with tab-based architecture
- **React Native Paper**: Material Design components for consistent UI
- **TypeScript**: Type safety throughout the frontend codebase
- **Main screens**: Home, Explore, Login with authentication flow

**2. Backend Layer - Multi-User Bot Management**
- `ImmobilienBotManager` (Singleton): Central orchestrator for all user bot instances
- `UserBot`: Individual bot instance per user with isolated configuration and state
- `ImmobilienCrawler`: Selenium-based web scraping engine adapted from original standalone bot
- Asyncio-based architecture enabling concurrent bot execution without blocking

**3. Database Layer (SQLAlchemy + SQLite)**
- `User`: Stores user credentials, admin flags, and JSON-serialized bot configurations
- `Bewerbung`: Applications submitted by bots (auto-created from crawled listings)
- `BotStatus`/`BotLog`: Real-time bot state tracking and structured logging
- `Statistik`, `Nachricht`: Analytics and internal messaging

**4. API Layer (FastAPI Routers)**
- **Authentication**: JWT-based with admin/user role separation
- **Bot Control**: Start/stop/configure individual user bots via REST API
- **Monitoring**: System-wide metrics, health checks, and alerting
- **Admin**: User management and system oversight
- **Data**: CRUD for applications, statistics, filters, support tickets

### Critical Integration Points

**Bot Configuration Flow:**
1. User stores `filter_einstellungen` (JSON) and `bewerbungsprofil` (JSON) in database
2. `UserBot` loads config from database (not files) when starting
3. `ImmobilienCrawler` uses Selenium to scrape WBM website with user-specific filters
4. Applications automatically saved to `bewerbungen` table with status tracking

**Lifecycle Management:**
- `lifespan()` context manager in `main.py` handles graceful startup/shutdown
- `maintenance_service` runs background tasks (log cleanup, health checks)
- `bot_manager` ensures all bots shut down cleanly on application exit

**Security Model:**
- JWT tokens for API authentication
- User-specific bot isolation (each bot only accesses own user's data)
- Admin endpoints require `is_admin=True` flag
- Bot configurations stored as JSON in database (not shared files)

### Bot Integration Specifics

The original standalone bot (`bot-beispiel/immobilien_bot.py`) was refactored into:
- **Config Source**: Database JSON fields instead of local JSON files
- **Multi-User**: Single bot manager coordinates multiple user bot instances
- **API Control**: REST endpoints replace command-line interface
- **Persistence**: All applications stored in SQLAlchemy models, not local tracking

**Selenium Integration:**
- Headless Chrome with automatic ChromeDriver detection
- Cookie handling and error recovery built-in
- Form filling automation for WBM application submissions
- Resource cleanup to prevent memory leaks in long-running service

### Development Workflow

**Adding New Frontend Features:**
1. New screens go in `frontend/app/` following Expo Router conventions
2. Reusable components in `frontend/components/` 
3. UI components in `frontend/components/ui/` for platform-specific implementations
4. Type definitions and constants in `frontend/constants/`
5. Custom hooks in `frontend/hooks/` for shared logic
6. Context providers in `frontend/contexts/` for global state

**Adding New Backend Features:**
1. Model changes go in `backend/models/` with SQLAlchemy definitions
2. API schemas in `backend/core/schemas.py` for request/response validation  
3. Business logic in `backend/services/` for reusable components
4. API endpoints in `backend/routers/` following existing authentication patterns
5. Database migrations handled by SQLAlchemy metadata.create_all()

**Bot Modifications:**
- Selenium logic in `backend/services/immobilien_crawler.py`
- Bot state management in `backend/services/user_bot.py`
- Orchestration changes in `backend/services/immobilien_bot_manager.py`

**Monitoring and Maintenance:**
- Structured logging via `backend/core/logging_config.py`
- Maintenance tasks in `backend/services/bot_maintenance.py`
- System metrics accessible via `/api/monitoring/*` endpoints

The system is designed for deployment as a single FastAPI service with SQLite, suitable for small to medium scale (hundreds of users). For larger scale, consider Redis for bot coordination and PostgreSQL for the database.

## Debugging and Troubleshooting

### Frontend Issues
```bash
# Clear Expo cache
cd frontend
npx expo start --clear

# Check frontend linting
npm run lint

# Reset React Native cache
npx react-native start --reset-cache

# Check TypeScript errors
npx tsc --noEmit
```

### Backend Issues
```bash
# Check bot status for all users
curl http://localhost:8000/api/monitoring/health

# View bot logs for current user
curl http://localhost:8000/api/bot/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Force restart a bot (admin only)
curl -X POST http://localhost:8000/api/bot/admin/stop/{user_id} \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Database Issues
```bash
# Reset database (will recreate all tables)
cd backend
rm app.db
python -c "from database.database import engine; from models import user; user.Base.metadata.create_all(bind=engine)"

# View raw database
sqlite3 app.db ".tables"
sqlite3 app.db "SELECT * FROM users;"
```

### ChromeDriver Issues
```bash
# Check ChromeDriver installation
which chromedriver
chromedriver --version

# Test Chrome in headless mode
google-chrome --headless --disable-gpu --remote-debugging-port=9222
```

## Key Configuration Points

### User Bot Configuration
Users store their bot settings as JSON in the database:
- `filter_einstellungen`: Search criteria (price, rooms, areas, WBS requirements)
- `bewerbungsprofil`: Personal data for form filling (name, address, contact info)

### Bot Manager Singleton
The `bot_manager` global instance in `immobilien_bot_manager.py` coordinates all user bots. It handles:
- Thread-safe bot lifecycle management
- Real-time metrics collection
- Graceful shutdown procedures
- Error recovery and logging

### Asyncio Architecture
Each UserBot runs in its own asyncio task, allowing concurrent execution without blocking. The system uses threading locks for shared state management while maintaining async execution for I/O-bound operations.