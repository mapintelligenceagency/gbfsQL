#!/usr/bin/env node
const { PubSub, ApolloServer, makeExecutableSchema } = require('apollo-server');
const bunyan = require('bunyan');
const { argv } = require('yargs')
  .boolean('v')
  .array('s')
  .alias('s', 'service')
  .alias('s', 'services');

const createSchema = require('./schema');
const FEED = require('./feeds');
const GBFS = require('./gbfs');
const pubSubKeysForSubscription = require('./pubSubKeysForSubscription');

// configure logger
global.logger = bunyan.createLogger({ name: 'gbfsQL', level: argv.v ? 'debug' : 'error' });

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

  server.listen({
    host: '0.0.0.0',
    port: 4000,
  }).then(({ url }) => {
    logger.info(`🚀 Server ready at ${url}`);
  });
});

process.on('SIGINT', () => {
  process.exit();
});
