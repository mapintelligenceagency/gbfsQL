FROM node:12-alpine

# Create app directory
WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT [ "node", "src/index.js" ]