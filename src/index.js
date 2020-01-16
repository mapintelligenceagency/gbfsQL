#!/usr/bin/env node

/*
  Velocity#https://nitro.openvelo.org/aachen/velocity/v1/gbfs.json
  Voi#https://nitro.openvelo.org/aachen/voi/v1/gbfs.json
  NextbikeBN#https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_bf/gbfs.json
  NextbikeCG#https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_kg/gbfs.json
*/
const { ApolloServer, makeExecutableSchema } = require('apollo-server');
const bunyan = require('bunyan');
const { argv } = require('yargs')
  .boolean('v')
  .array('s')
  .alias('s', 'service')
  .alias('s', 'services');

const createSchema = require('./schema');
const FEED = require('./feeds');
const GBFS = require('./gbfs');

// configure logger
global.logger = bunyan.createLogger({ name: 'gbfsQL', level: argv.v ? 'debug' : 'error' });

// Exit if no services are given
const givenServices = argv.services;
if (!givenServices || givenServices.length === 0) {
  logger.error('No services were provided');
  process.exit(1);
}

// Turn services into GBFS objects
const services = givenServices.map((service) => {
  const [name, ...url] = service.split('#');
  return new GBFS(name.trim(), url.join(''));
});
const promises = services.map((s) => s.load());

// Load all services to see which feeds are available
Promise.all(promises).then(() => {
  const queryResolvers = Object.fromEntries(services
    .map((gbfs) => [gbfs.serviceKey, () => ({
      systemInformation: () => gbfs.systemInformation(),
      stations: () => gbfs.stations(),
      bikes: () => gbfs.bikes(),
    }),
    ]));
  const stationResolvers = Object.fromEntries(services.filter((s) => !!s.feeds[FEED.stationStatus])
    .map((gbfs) => [`${gbfs.serviceKey}Station`, {
      currentStatus: (station) => gbfs.stationStatus(station.station_id),
    },
    ]));

  const typeDefs = createSchema(services);

  const resolvers = {
    Query: queryResolvers,
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
    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
    port: 4000,
  }).then(({ url }) => {
    logger.info(`🚀 Server ready at ${url}`);
  });
});

process.on('SIGINT', () => {
  process.exit();
});
