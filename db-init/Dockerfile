FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

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