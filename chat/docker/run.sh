#!/bin/sh
set -e

echo "🚀 Starting chat service..."

npm install

sleep 200

npm run dev
