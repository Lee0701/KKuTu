FROM node:12

WORKDIR /app

COPY ./Server/setup.js ./Server/
COPY ./Server/package*.json ./Server/
COPY ./Server/lib/package*.json ./Server/lib/
COPY ./Server/lib/ ./Server/lib/

RUN cd Server && npm install && node setup
RUN cd Server/lib && npm install && npx grunt default pack

WORKDIR /kkutu