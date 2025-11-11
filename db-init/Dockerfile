FROM node:20-slim

# Install curl for health checks (Debian/apt)
RUN apt-get update && apt-get install -y curl sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create database directory
RUN mkdir -p /usr/src/app/db

EXPOSE 3000

CMD ["npm", "start"]