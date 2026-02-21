#!/bin/bash

export VITE_PB_URL="http://localhost:8090"

echo "Starting PocketBase..."
./backend_dev/pocketbase serve --http=0.0.0.0:8090 --dir=./backend_dev/pb_data --migrationsDir=./backend/pb_migrations &
PB_PID=$!

sleep 2

echo "Starting frontend dev server..."
cd frontend
npx vite --host 0.0.0.0 --port 5000 &
VITE_PID=$!
cd ..

trap "kill $PB_PID $VITE_PID 2>/dev/null; exit" SIGTERM SIGINT EXIT

wait
