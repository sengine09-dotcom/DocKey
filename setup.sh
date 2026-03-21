#!/bin/bash

# Doc Key - Setup Script
# This script helps initialize the Doc Key project

set -e

echo "================================"
echo "Doc Key - Setup Script"
echo "================================"
echo ""

# Check if MySQL is available
echo "Checking MySQL installation..."
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    echo "   macOS: brew install mysql"
    echo "   Ubuntu/Debian: sudo apt-get install mysql-server"
    echo "   Windows: Download from https://dev.mysql.com/downloads/mysql/"
    exit 1
fi
echo "✅ MySQL found"

# Check if Node.js is available
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js found ($(node --version))"

echo ""
echo "================================"
echo "Step 1: Database Setup"
echo "================================"

# Check if database exists
if mysql -u root -e "USE doc_key" 2>/dev/null; then
    echo "Database 'doc_key' already exists"
    read -p "Do you want to recreate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Initializing database..."
        mysql -u root < docs/schema.sql
        echo "✅ Database initialized"
    fi
else
    echo "Creating database 'doc_key'..."
    mysql -u root < docs/schema.sql
    echo "✅ Database created"
fi

echo ""
echo "================================"
echo "Step 2: Backend Setup"
echo "================================"

cd backend
echo "Installing backend dependencies..."
npm install > /dev/null 2>&1
echo "✅ Backend dependencies installed"

echo ""
echo "================================"
echo "Step 3: Frontend Setup"
echo "================================"

cd ../frontend
echo "Installing frontend dependencies..."
npm install > /dev/null 2>&1
echo "✅ Frontend dependencies installed"

cd ..

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "To start the project:"
echo ""
echo "Terminal 1 - Backend (http://localhost:5000):"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend (http://localhost:5173):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
