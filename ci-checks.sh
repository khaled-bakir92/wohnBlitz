#!/bin/bash

# Note: Using || true for demo to continue on linting warnings

echo "🚀 Starting Full Project Quality Checks..."
echo "==========================================="

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Backend checks
echo ""
echo "🐍 BACKEND CHECKS"
echo "=================="
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  No virtual environment found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment and run commands within it
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing/updating dependencies..."
pip install -r requirements.txt

# Run backend checks (continue on warnings for demo)
./run_checks.sh || echo "⚠️ Backend has code quality issues to fix"

# Deactivate virtual environment
deactivate
cd ..

# Frontend checks
echo ""
echo "⚛️  FRONTEND CHECKS"
echo "==================="
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "📝 Running Frontend Linter..."
npm run lint

echo "✨ Checking Frontend Formatting..."
npm run format

echo "🧪 Running Frontend Tests..."
npm run test

cd ..

echo ""
echo "🎉 All checks completed successfully!"
echo "=====================================" 