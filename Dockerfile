FROM mhart/alpine-node:latest

# RUN mkdir /app
WORKDIR /app

COPY package.json yarn.lock ./
RUN apk add --no-cache git mercurial
RUN which git
RUN apk add --update make
RUN apk add --update g++
RUN which make
RUN which gcc
RUN yarn install --production

FROM mhart/alpine-node:latest
WORKDIR /app
COPY --from=0 /app .
COPY ./src ./src
RUN rm -rf ./node_modules/gdax-trading-toolkit/build/src
RUN mkdir ./node_modules/gdax-trading-toolkit/build/src
COPY ./node_modules/gdax-trading-toolkit/build/src ./node_modules/gdax-trading-toolkit/build/src
COPY tsconfig.json .
COPY .nycrc .
COPY .eslintrc.js .
RUN npm install -g typescript
RUN yarn run build

FROM mhart/alpine-node:latest
WORKDIR /app
COPY --from=1 /app .

RUN mkdir -p logs
RUN mkdir -p errorlogs
VOLUME ["/logs", "/errorlogs"]
ENV PORT 3000
EXPOSE 3000
ENTRYPOINT ["node", "build/index.js"]