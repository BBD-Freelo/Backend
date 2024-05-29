FROM node:21-alpine
WORKDIR /app
COPY /etc/letsencrypt/live/freeloooo.duckdns.org/fullchain.pem /app/ssl/fullchain.pem
COPY /etc/letsencrypt/live/freeloooo.duckdns.org/privkey.pem /app/ssl/privkey.pem
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "serve"]
