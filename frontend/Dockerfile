FROM node:20-slim

WORKDIR /app

# Copy source and runtime script
COPY . .

EXPOSE 8080

RUN npm install --no-package-lock

CMD ["npm", "run", "dev"]
# CMD ["sh", "-lc", "./docker/run.sh"]
