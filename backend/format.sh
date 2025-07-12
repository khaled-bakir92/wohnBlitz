#!/bin/bash

echo "✨ Auto-formatting Python code with black..."
black .

echo "🔧 Sorting imports with isort..."
isort .

echo "✅ Code formatting completed!" 