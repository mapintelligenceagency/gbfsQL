const { ApolloServer, makeExecutableSchema } = require('apollo-server');
const createSchema = require('./schema');
const FEED = require('./feeds');

const GBFS = require('./gbfs');

const services = [
  new GBFS('Velocity', 'https://nitro.openvelo.org/aachen/velocity/v1/gbfs.json'),
  new GBFS('Voi', 'https://nitro.openvelo.org/aachen/voi/v1/gbfs.json'),
  new GBFS('NextbikeBN', 'https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_bf/gbfs.json'),
  new GBFS('NextbikeCG', 'https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_kg/gbfs.json'),
];

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
