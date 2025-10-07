FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /usr/src/app/db

EXPOSE 3000

CMD ["npm", "start"]