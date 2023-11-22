FROM node:18.17.1

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN apt-get update && apt-get install -y sendmail

RUN apt-get install -y redis-server

COPY . .

EXPOSE 9000

CMD service redis-server start && npm start
