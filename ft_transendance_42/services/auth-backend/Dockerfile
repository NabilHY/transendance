FROM node:20-slim

WORKDIR /usr/src/app

# Install SQLite3 and other dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install && npm install -g nodemon

COPY . .

EXPOSE 8005

CMD ["npm", "start"]