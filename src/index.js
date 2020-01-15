const { ApolloServer, makeExecutableSchema } = require('apollo-server');
const createSchema = require('./schema');

const GBFS = require('./gbfs');

const services = {
  Velocity: new GBFS('Velocity', 'https://nitro.openvelo.org/aachen/velocity/v1/gbfs.json'),
  Voi: new GBFS('Voi', 'https://nitro.openvelo.org/aachen/voi/v1/gbfs.json'),
};

const queryResolvers = Object.fromEntries(Object.entries(services)
  .map(([serviceKey, gbfs]) => [serviceKey, () => ({
    systemInformation: () => gbfs.systemInformation(),
    stations: () => gbfs.stations(),
    bikes: () => gbfs.bikes(),
  }),
  ]));


const promises = Object.values(services).map((s) => s.load());

Promise.all(promises).then(() => {
  const typeDefs = createSchema(services);

  const resolvers = {
    Query: queryResolvers,
    Station: {
      currentStatus: (station) => services[station.SERVICEKEY].stationStatus(station.station_id),
    },
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

  setInterval(() => {
    Object.values(services).forEach((s) => s.crawl());
  }, 10000);

  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
});
