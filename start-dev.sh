#!/bin/bash
# CodeForge - Start all services
# Usage: ./start-dev.sh

set -e

echo "🔧 Stopping any processes on required ports..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
sleep 1

echo "✅ Ports cleared. Starting services..."

# Start api-service (port 3001)
echo "🚀 Starting api-service on :3001..."
cd apps/api-service && npm run dev &
sleep 3

# Start socket-service (port 3002)
echo "🔌 Starting socket-service on :3002..."
cd ../socket-service && npm run dev &
sleep 2

# Start execution-service (worker)
echo "⚙️  Starting execution-service..."
cd ../execution-service && npm run dev &
sleep 1

# Start web frontend (port 3000)
echo "🌐 Starting web on :3000..."
cd ../web && npm run dev &

echo ""
echo "=========================================="
echo "  CodeForge Services Running"
echo "=========================================="
echo "  Web:        http://localhost:3000"
echo "  API:        http://localhost:3001"
echo "  Socket:     http://localhost:3002"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379 (Docker)"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services..."

wait
