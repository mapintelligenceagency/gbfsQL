#!/usr/bin/env node

const { argv } = require('yargs')
  .boolean('v')
  .array('s')
  .alias('s', 'service')
  .alias('s', 'services');

const winston = require('winston');

global.logger = winston.createLogger({
  level: argv.v ? 'silly' : 'error',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

const givenServices = argv.services;
if (!givenServices || givenServices.length === 0) {
  logger.error('No services were provided');
  process.exit(1);
}

const { ApolloServer, makeExecutableSchema } = require('apollo-server');
const createSchema = require('./schema');
const FEED = require('./feeds');

const GBFS = require('./gbfs');

const services = givenServices.map((service) => {
  const [name, ...url] = service.split('#');
  return new GBFS(name, url.join(''));
});
/*
const services = [
  new GBFS('Velocity', 'https://nitro.openvelo.org/aachen/velocity/v1/gbfs.json'),
  new GBFS('Voi', 'https://nitro.openvelo.org/aachen/voi/v1/gbfs.json'),
  new GBFS('NextbikeBN', 'https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_bf/gbfs.json'),
  new GBFS('NextbikeCG', 'https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_kg/gbfs.json'),
];
*/
const promises = services.map((s) => s.load());

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

  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
});

process.on('SIGINT', () => {
  process.exit();
});
