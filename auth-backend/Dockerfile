FROM node:20-slim

WORKDIR /usr/src/app

# Install SQLite3 and other dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN chmod +x docker/run.sh

EXPOSE 8005

CMD ["sh", "-lc", "./docker/run.sh"]