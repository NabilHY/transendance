FROM node:20.19

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

# COPY package*.json ./
COPY . .

RUN npm install

EXPOSE 4000

CMD ["npm", "run", "dev"]
