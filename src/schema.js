const FEED = require('./feeds');

const queryType = {
  [FEED.systemInformation]: (name) => `systemInformation: ${name}SystemInformation`,
  [FEED.stationInformation]: (name) => `stations: [${name}Station]`,
  [FEED.stationStatus]: () => '',
  [FEED.freeBikeStatus]: (name) => `bikes: [${name}Bike]`,
};


const systemInformationBody = `
system_id: String!
language: String!
name: String!
short_name: String
operator: String
url: String
purchase_url: String
start_date: String
phone_number: String
email: String
feed_contact_email: String
timezone: String!
license_url: String
`;

const stationBody = `
station_id: Int!
name: String!
short_name: String
lat: Float!
lon: Float!
address: String
cross_street: String
region_id: Int
post_code: String
rental_methods: [RentalMethod]
capacity: Int
`;

const stationStatusBody = `
station_id: Int!
num_bikes_available: Int!
num_bikes_disabled: Int
num_docks_available: Int!
num_docks_disabled: Int
is_installed: Boolean!
is_renting: Boolean!
is_returning: Boolean!
last_reported: String!
`;

const bikeBody = `
bike_id: String!
lat: Float!
lon: Float!
is_reserved: Boolean!
is_disabled: Boolean!
`;

const buildSystemInformation = (name) => `
  type ${name}SystemInformation implements SystemInformation {
    ${systemInformationBody}
  }
`;

const buildStation = (name) => `
  type ${name}Station implements Station {
    ${stationBody}
    currentStatus: ${name}StationStatus
  }
`;

const buildStationStatus = (name) => `
  type ${name}StationStatus implements StationStatus {
    ${stationStatusBody}
  }
`;

const buildFreeBike = (name) => `
type ${name}Bike implements Bike {
  ${bikeBody}
}
`;

const buildQueryBlock = (name, feeds) => `
  type ${name} {
    ${feeds.map((feed) => queryType[feed](name)).join('\n')}
  }
`;

const buildQuery = (names) => `
  type Query {
    ${names.map((name) => `${name}: ${name}`).join('\n')}
  }
`;

const buildSubscription = (names) => `
type Subscription {
  ${names.map((name) => `${name}: ${name}`).join('\n')}
}
`;

module.exports = (services) => {
  let dynamicString = '';
  services.forEach((gbfs) => {
    const name = gbfs.serviceKey;
    const feeds = Object.keys(gbfs.feeds);

    dynamicString += feeds.map((feed) => {
      switch (feed) {
        case FEED.systemInformation:
          return buildSystemInformation(name);
        case FEED.stationInformation:
          return buildStation(name);
        case FEED.stationStatus:
          return buildStationStatus(name);
        case FEED.freeBikeStatus:
          return buildFreeBike(name);
        default:
          return '';
      }
    });
    dynamicString += buildQueryBlock(name, feeds);
  });
  dynamicString += buildQuery(services.map((s) => s.serviceKey));
  dynamicString += buildSubscription(services.map((s) => s.serviceKey));

  const main = `
  enum RentalMethod {
    KEY
    CREDITCARD
    PAYPASS
    APPLEPAY
    ANDROIDPAY
    TRANSITCARD
    ACCOUNTNUMBER
    PHONE
  }

  interface Station {
    ${stationBody}
    currentStatus: StationStatus
  }

  interface StationStatus {
    ${stationStatusBody}
  }

  interface SystemInformation {
    ${systemInformationBody}
  }

  interface Bike {
    ${bikeBody}
  }

  interface RentalURI {
    android: String
    iOS: String
    web: String
  }

  ${dynamicString}
  
  `;
  logger.info(`Generated schema:\n${main}`);
  return main;
};
