#!/bin/sh
set -e

# Ensure database directory exists
mkdir -p /usr/src/app/db

# Start the database service
npm start

