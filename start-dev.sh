#!/bin/bash
set -e

export VITE_PB_URL="http://localhost:8090"

echo "==> Starting PocketBase on :8090..."
./backend_dev/pocketbase serve --http=0.0.0.0:8090 --dir=./backend_dev/pb_data --migrationsDir=./backend/pb_migrations &
PB_PID=$!

sleep 2
echo "==> PocketBase running (pid $PB_PID)"

echo "==> Starting Vite frontend on :5000..."
cd frontend
NODE_PATH=../node_modules npx --yes vite --host 0.0.0.0 --port 5000
