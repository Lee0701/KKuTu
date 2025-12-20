FROM node:12

WORKDIR /app

COPY ./Server/setup.js ./Server/
COPY ./Server/package*.json ./Server/
COPY ./Server/lib/package*.json ./Server/lib/
COPY ./Server/lib/ ./Server/lib/

RUN cd Server && npm install && node setup
RUN cd Server/lib && npm install && npx grunt default pack

RUN npm install pm2 -g
COPY ./kkutu.json ./

CMD ["pm2-runtime", "start", "kkutu.json"]
