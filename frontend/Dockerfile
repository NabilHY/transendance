FROM node:20-alpine

WORKDIR /app

# Copy source and runtime script
COPY . .

RUN chmod +x docker/run.sh

EXPOSE 8080
CMD ["sh", "-lc", "./docker/run.sh"]