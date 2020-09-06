#!/usr/bin/env node

const Sentry = require('@sentry/node');
const { PubSub, ApolloServer, makeExecutableSchema } = require('apollo-server-express');
const express = require('express');
const http = require('http');
const cors = require('cors');
const bunyan = require('bunyan');
const { argv } = require('yargs')
  .boolean('dashboard')
  .boolean('v')
  .alias('v', 'verbose')
  .array('s')
  .alias('s', 'service')
  .alias('s', 'services')
  .number('p')
  .default('p', 4000)
  .alias('p', 'port');

const PORT = argv.port;
const createSchema = require('./schema');
const FEED = require('./feeds');
const GBFS = require('./gbfs');
const pubSubKeysForSubscription = require('./pubSubKeysForSubscription');

const bunyanStreams = [{
  stream: process.stdout,
  level: argv.v ? 'debug' : 'error',
}];

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  bunyanStreams.push({
    level: 'error',
    type: 'raw',
    stream: {
      write(record) {
        Sentry.captureMessage(record.msg, 'error');
      },
    },
  });
}

// configure logger
global.logger = bunyan.createLogger({
  name: 'gbfsQL',
  streams: bunyanStreams,
});

// Exit if no services are given
const givenServices = argv.services;
if (!givenServices || givenServices.length === 0) {
  logger.error('No services were provided');
  process.exit(1);
}

const pubSub = new PubSub();

// Turn services into GBFS objects
const services = givenServices.map((service) => {
  const [serviceKey, ...url] = service.split('#');
  return new GBFS({
    serviceKey: serviceKey.trim(),
    autoDiscoveryURL: url.join(''),
    pubSub,
  });
});
const promises = services.map((s) => s.load());

// Load all services to see which feeds are available
Promise.all(promises).then(() => {
  const queryResolvers = Object.fromEntries(services
    .map((gbfs) => [gbfs.serviceKey, () => gbfs.fullObject()]));

  const subscriptionResolvers = Object.fromEntries(
    services.map((gbfs) => [
      gbfs.serviceKey,
      {
        subscribe: (...meta) => pubSub.asyncIterator(
          pubSubKeysForSubscription(gbfs.serviceKey, meta),
        ),
      },
    ]),
  );

  const stationResolvers = {};
  services.filter((gbfs) => !!gbfs.feeds[FEED.stationInformation]).forEach((gbfs) => {
    const stationName = `${gbfs.serviceKey}Station`;
    stationResolvers[stationName] = {};
    if (gbfs.feeds[FEED.stationInformation]) {
      stationResolvers[stationName].currentStatus = (station) => gbfs.stationStatus(station.station_id);
    }
    if (gbfs.feeds[FEED.systemAlerts]) {
      stationResolvers[stationName].currentSystemAlerts = (station) => gbfs.systemAlertForStation(station.station_id);
    }
  });

  const typeDefs = createSchema(services);

  const resolvers = {
    Query: queryResolvers,
    Subscription: subscriptionResolvers,
    ...stationResolvers,
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    resolverValidationOptions: {
      // Disable warnings for interfaces without resolver
      requireResolversForResolveType: false,
    },
  });
  const server = new ApolloServer({
    schema,
  });

  const app = express();
  if (argv.dashboard) {
    app.use(cors());
    app.get('/stats', (req, res) => {
      res.json({
        services,
      });
    });
    app.use('/dashboard', express.static('dashboard/dist'));
  }
  server.applyMiddleware({ app });
  const httpServer = http.createServer(app);
  server.installSubscriptionHandlers(httpServer);

  // ⚠️ Pay attention to the fact that we are calling `listen` on the http server variable, and not on `app`.
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    logger.info(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`);
  });
});

process.on('SIGINT', () => {
  process.exit();
});
