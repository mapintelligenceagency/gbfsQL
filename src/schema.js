/* eslint-disable no-unused-vars */
const FEED = require('./feeds');

const queryType = {
  [FEED.systemInformation]: (name) => `systemInformation: ${name}SystemInformation`,
  [FEED.stationInformation]: (name) => `stations: [${name}Station]`,
  [FEED.stationStatus]: () => '',
  [FEED.freeBikeStatus]: (name) => `bikes(with_ids: [String]): [${name}Bike]`,
  [FEED.systemAlerts]: (name) => `systemAlerts: [${name}SystemAlert]`,
  [FEED.vehicleTypes]: (name) => `vehicleTypes: [${name}VehicleTypes]`,
};

const vehicleTypeBody = () => `
vehicle_type_id: String
form_factor: String
propulsion_type: String
max_range_meters: Int!
name: String!
`;

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

const stationStatusBody = (_name = [], feeds = []) => {
  let string = `
  station_id: Int!
  num_bikes_available: Int!
  num_bikes_disabled: Int
  num_docks_available: Int!
  num_docks_disabled: Int
  is_installed: Boolean!
  is_renting: Boolean!
  is_returning: Boolean!
  last_reported: Int!
  count: Int`;
  if (feeds.includes(FEED.vehicleTypes)) {
    string += '\nvehicles: [DockedVehicle]';
    string += '\nvehicle_docks_available: [AvailableDock]';
  }
  return string;
};

const bikeBody = (_name = '', feeds = []) => {
  let string = `
  bike_id: String!
  lat: Float!
  lon: Float!
  is_reserved: Boolean!
  is_disabled: Boolean!
  `;
  if (feeds.includes(FEED.vehicleTypes)) {
    string += '\nvehicle_type_id: String';
    string += '\ncurrent_range_meters: Float';
    string += '\nmia_battery: Float';
  }
  return string;
};

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
          return build(name, 'SystemInformation', systemInformationBody, feeds);
        case FEED.stationInformation:
          return build(name, 'Station', stationBody, feeds);
        case FEED.stationStatus:
          return build(name, 'StationStatus', stationStatusBody, feeds);
        case FEED.freeBikeStatus:
          return build(name, 'Bike', bikeBody, feeds);
        case FEED.systemAlerts:
          return build(name, 'SystemAlert', systemAlertBody, feeds);
        case FEED.vehicleTypes:
          return build(name, 'VehicleTypes', vehicleTypeBody, feeds);
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

  type DockedVehicle {
    bike_id: String
    is_reserved: Boolean
    is_disabled: Boolean
    vehicle_type_id: String
    current_range_meters: Float
    mia_battery: Float
  }

  type AvailableDock {
    vehicle_type_ids: [String]
    count: Int
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

  interface VehicleTypes {
    ${vehicleTypeBody()}
  }

  ${dynamicString}
  
  `;
  logger.info(`Generated schema:\n${main}`);
  return main;
};
