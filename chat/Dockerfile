FROM node:20-slim AS build

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

FROM node:20-slim

WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app/db

COPY --from=build /usr/src/app ./

EXPOSE ${CHAT_PORT:-4009}

CMD ["sh", "-lc", "chmod +x ./docker/run.sh && ./docker/run.sh"]
