FROM zenika/alpine-chrome:with-puppeteer
# FROM ghcr.io/puppeteer/puppeteer:latest

USER root
ENV NODE_ENV=production
WORKDIR /src

COPY package.json yarn.lock ./
RUN yarn

COPY . .
EXPOSE 8080
CMD ["yarn" , "start"]