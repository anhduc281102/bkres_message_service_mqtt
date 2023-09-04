FROM node:14

RUN apt-get update && apt-get install -y mosquitto mosquitto-clients

WORKDIR /app

COPY . .

RUN npm install

CMD ["node", "index.js"]  

EXPOSE 1883 
