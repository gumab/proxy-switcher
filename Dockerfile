FROM node:12
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .
EXPOSE 8080
EXPOSE 9090

CMD ["node", "index.js"]

