#!/bin/bash

set -e  # Exit on any error

echo "🔍 Starting Backend Quality Checks..."
echo "====================================="

echo "📝 Running Linter (flake8)..."
flake8 .

echo "✨ Checking Code Formatting (black)..."
black --check .

echo "🔍 Running Type Checker (mypy)..."
mypy .

echo "🧪 Running Tests (pytest)..."
pytest --cov=. --cov-report=term-missing

echo "✅ All backend checks passed!" 