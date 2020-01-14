const fs = require('fs');
const path = require('path');

const { ApolloServer } = require('apollo-server');
const GBFS = require('./gbfs');

const services = {
  Velocity: new GBFS('Velocity', 'https://nitro.openvelo.org/aachen/velocity/v1/gbfs.json'),
  Voi: new GBFS('Voi', 'https://nitro.openvelo.org/aachen/voi/v1/gbfs.json'),
};

setInterval(() => {
  Object.values(services).forEach((s) => s.crawl());
}, 10000);

const gqlServiceEnum = `enum Service { ${Object.keys(services).join(', ')} }\n`;
const typeDefs = gqlServiceEnum + fs.readFileSync(path.join(__dirname, '../schemas/gbfs.graphql'), 'utf8');


const resolvers = {
  Query: {
    stations: (_, { service }) => services[service].stations(),
    systemInformation: (_, { service }) => services[service].systemInformation(),
  },
  Station: {
    currentStatus: (station) => services[station.SERVICEKEY].stationStatus(station.station_id),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
