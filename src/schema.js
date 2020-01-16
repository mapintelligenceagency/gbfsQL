const FEED = require('./feeds');

const queryType = {
  [FEED.systemInformation]: (name) => `systemInformation: ${name}SystemInformation`,
  [FEED.stationInformation]: (name) => `stations: [${name}Station]`,
  [FEED.stationStatus]: () => '',
  [FEED.freeBikeStatus]: (name) => `bikes: [${name}Bike]`,
  [FEED.systemAlerts]: (name) => `systemAlerts: [${name}SystemAlert]`,
};

const systemAlertBody = () => `
alert_id: String!
type: AlertType!
times: AlertTime
station_ids: [String]
region_ids: [String]
url: String
summary: String!
description: String
last_updated: String
`;

const systemInformationBody = () => `
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

const stationBody = (name = '', feeds = []) => {
  let string = `
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
  if (feeds.includes(FEED.stationInformation)) {
    string += `\ncurrentStatus: ${name}StationStatus`;
  }
  if (feeds.includes(FEED.systemAlerts)) {
    string += `\ncurrentSystemAlerts: [${name}SystemAlert]`;
  }
  return string;
};

const stationStatusBody = () => `
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

const bikeBody = () => `
bike_id: String!
lat: Float!
lon: Float!
is_reserved: Boolean!
is_disabled: Boolean!
`;

const build = (name, superClass, body, feeds) => `
type ${name}${superClass} implements ${superClass} {
  ${body(name, feeds)}
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
          return build(name, 'SystemInformation', systemInformationBody);
        case FEED.stationInformation:
          return build(name, 'Station', stationBody, feeds);
        case FEED.stationStatus:
          return build(name, 'StationStatus', stationStatusBody);
        case FEED.freeBikeStatus:
          return build(name, 'Bike', bikeBody);
        case FEED.systemAlerts:
          return build(name, 'SystemAlert', systemAlertBody);
        default:
          return '';
      }
    });
    dynamicString += buildQueryBlock(name, feeds);
  });
  dynamicString += buildQuery(services.map((gbfs) => gbfs.serviceKey));
  dynamicString += buildSubscription(services.map((gbfs) => gbfs.serviceKey));

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

  enum AlertType {
    SYSTEM_CLOSURE
    STATION_CLOSURE
    STATION_MOVE
    OTHER
  }

  type AlertTime {
    start: Int!
    end: Int
  }

  type RentalURI {
    android: String
    iOS: String
    web: String
  }

  interface Station {
    ${stationBody()}
  }

  interface StationStatus {
    ${stationStatusBody()}
  }

  interface SystemInformation {
    ${systemInformationBody()}
  }

  interface Bike {
    ${bikeBody()}
  }

  interface SystemAlert {
    ${systemAlertBody()}
  }


  ${dynamicString}
  
  `;
  logger.info(`Generated schema:\n${main}`);
  return main;
};
