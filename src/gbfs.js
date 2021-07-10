const request = require('request-promise-native');
const FEED = require('./feeds');

const supportedFeeds = [
  FEED.systemInformation,
  FEED.stationInformation,
  FEED.stationStatus,
  FEED.freeBikeStatus,
  FEED.systemAlerts,
  FEED.vehicleTypes,
  FEED.geofencingZones,
];

const calculateVehicleBatteries = (vehicles, vehicleTypes) => vehicles.map((vehicle) => ({
  ...vehicle,
  x_mia_battery: parseFloat(((vehicle.current_range_meters
    / vehicleTypes.find((vehicleType) => vehicleType.vehicle_type_id === vehicle.vehicle_type_id).max_range_meters)
    * 100
  ).toFixed(2)),
}));

class GBFS {
  constructor({ serviceKey, autoDiscoveryURL, pubSub }) {
    this.serviceKey = serviceKey;
    this.autoDiscoveryURL = autoDiscoveryURL;
    this.pubSub = pubSub;
    this.feeds = {};
    this.feedCache = {};
  }

  async load() {
    if (this.autoDiscoveryURL) {
      const gbfs = await request(this.autoDiscoveryURL, { json: true });
      if (!gbfs) {
        logger.error(`Request to ${this.autoDiscoveryURL} was not successful`);
        process.exit(1);
      }
      const providedFeeds = gbfs.data.en.feeds.filter((feed) => supportedFeeds.includes(feed.name));

      if (providedFeeds.length === 0) {
        logger.warning(`No services discovered for ${this.serviceKey}`);
      }

      const feedPromises = providedFeeds.map((feed) => {
        this.feeds[feed.name] = feed.url;
        logger.info(`Found ${feed.name} for ${this.serviceKey}`);
        return this.crawl(feed);
      });
      await Promise.all(feedPromises);
    }
  }

  async crawl({ name, url }) {
    let ttl;
    try {
      const feedResponse = await request(url, { json: true });
      this.feedCache[name] = feedResponse.data;
      ttl = parseInt(feedResponse.ttl, 10) * 1000;
      logger.info(`Fetched ${name} for ${this.serviceKey} at ${url}`);

      this.pubSub.publish(`${this.serviceKey}.${name}`, {
        [this.serviceKey]: this.fullObject(),
      });
    } catch (error) {
      logger.error(error);
    } finally {
      setTimeout(() => this.crawl({ name, url }), ttl || 60000);
    }
  }

  stations(withIds = undefined) {
    const { stations } = this.feedCache[FEED.stationInformation];
    if (withIds !== undefined) {
      return stations.filter((station) => withIds.includes(station.station_id));
    }
    return stations;
  }

  systemInformation() {
    return this.feedCache[FEED.systemInformation];
  }

  bikes(withIds = undefined) {
    let { bikes } = this.feedCache[FEED.freeBikeStatus];
    if (withIds !== undefined) {
      bikes = bikes.filter((bike) => withIds.includes(bike.bike_id));
    }
    if (this.feedCache[FEED.vehicleTypes]) {
      bikes = calculateVehicleBatteries(bikes, this.feedCache[FEED.vehicleTypes].vehicle_types);
    }
    return bikes;
  }

  systemAlerts() {
    return this.feedCache[FEED.systemAlerts].alerts;
  }

  vehicleTypes() {
    return this.feedCache[FEED.vehicleTypes].vehicle_types;
  }

  geofencingZones() {
    return JSON.stringify(this.feedCache[FEED.geofencingZones].geofencingZones);
  }

  fullObject() {
    const object = {
      systemInformation: () => this.systemInformation(),
    };
    if (this.feeds[FEED.freeBikeStatus]) {
      object.bikes = ({ with_ids: withIds }) => this.bikes(withIds);
    }

    if (this.feeds[FEED.stationInformation]) {
      object.stations = ({ with_ids: withIds }) => this.stations(withIds);
    }

    [FEED.systemAlerts, FEED.vehicleTypes, FEED.geofencingZones].forEach((feed) => {
      // Get the key of the feed e.g. "systemAlerts" or "vehicleTypes"
      const [key] = Object.entries(FEED).find(([, value]) => value === feed);
      if (this.feeds[feed]) {
        object[key] = () => this[key]();
      }
    });

    return object;
  }

  stationStatus(stationId) {
    const allStatus = this.feedCache[FEED.stationStatus].stations;
    const status = allStatus.find(
      (s) => s.station_id.toString() === stationId.toString(),
    );
    if (status && this.feedCache[FEED.vehicleTypes]) {
      status.vehicles = calculateVehicleBatteries(status.vehicles, this.feedCache[FEED.vehicleTypes].vehicle_types);
    }
    return status || null;
  }

  systemAlertForStation(stationId) {
    const allSystemAlerts = this.feedCache[FEED.systemAlerts].alerts;
    const alerts = allSystemAlerts.filter((alert) => alert.station_ids.includes(stationId));
    return alerts;
  }
}

module.exports = GBFS;
