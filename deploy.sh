#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Building frontend..."
npm run build 2>&1 | tail -3

echo "Copying to server/static..."
rm -rf server/static
cp -r dist server/static

echo "Building Docker image (cached)..."
docker build -t substack-downloader-substack-saver:latest . 2>&1 | tail -3

echo "Recreating container..."
docker stop substack-saver 2>/dev/null || true
docker rm substack-saver 2>/dev/null || true
docker run -d --name substack-saver --restart always \
  -p 127.0.0.1:8999:8999 \
  -e PYTHONUNBUFFERED=1 \
  substack-downloader-substack-saver:latest

sleep 2
echo "Health: $(curl -s http://127.0.0.1:8999/api/health)"
echo "Done! Tunnel: substack.server-fadil.my.id"
