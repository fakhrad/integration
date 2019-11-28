FROM node:alpine AS integration

WORKDIR /app
COPY . /app 
RUN npm install



