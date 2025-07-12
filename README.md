# Wohnblitzer 🏠

**Modern Real Estate Application** - React Native Frontend with FastAPI Backend

## 🏗️ Project Structure

```
Wohnblitzer/
├── frontend/          # React Native Expo App
├── backend/           # Python FastAPI Backend
├── docs/              # Documentation & API Guides
├── scripts/           # Build & Testing Scripts
└── package.json       # Monorepo Configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip
- Expo CLI (`npm install -g @expo/cli`)

### Installation
```bash
# Install frontend dependencies
npm run install:frontend

# Install backend dependencies  
npm run install:backend

# Install development tools
npm install
```

### Development
```bash
# Start both frontend and backend simultaneously
npm run dev

# Or start individually:
npm run frontend        # Start Expo development server
npm run backend:dev     # Start FastAPI with auto-reload
```

## 📱 Frontend (React Native + Expo)
- **Location**: `./frontend/`
- **Tech**: React Native, Expo SDK 53, TypeScript
- **Features**: Cross-platform mobile app (iOS, Android, Web)

### Frontend Commands
```bash
npm run frontend:android    # Run on Android
npm run frontend:ios        # Run on iOS
npm run frontend:web        # Run on Web
```

## 🔧 Backend (FastAPI)
- **Location**: `./backend/`
- **Tech**: Python, FastAPI, SQLite
- **Features**: REST API, Database Management, Authentication

### Backend Commands
```bash
npm run backend:dev         # Development server with auto-reload
npm run test:api           # Run API tests
```

## 📚 Documentation
- **API Documentation**: See `./docs/` folder
- **API Testing**: `npm run test:api`
- **Live API Docs**: http://localhost:8000/docs (when backend running)

## 🛠️ Development Tools
```bash
npm run clean              # Clean all node_modules and cache
```

## 🔗 Useful Links
- [Expo Documentation](https://docs.expo.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Native Documentation](https://reactnative.dev/)

---

  # Backend starten:
  cd backend
  source venv/bin/activate
  python main.py

  # Frontend starten:
  cd frontend
  npm start
*Built with ❤️ using Expo and FastAPI* 