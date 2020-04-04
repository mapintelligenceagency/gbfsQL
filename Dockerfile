FROM node:12-alpine

WORKDIR /usr/src/app/dashboard

COPY dashboard/package.json dashboard/yarn.lock ./

RUN yarn
COPY dashboard ./
RUN yarn build

WORKDIR /usr/src/app/

COPY package.json yarn.lock ./

RUN yarn

COPY . .

ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT [ "node", "src/index.js" ]