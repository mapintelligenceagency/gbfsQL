const request = require("request-promise-native");
const FEED = require("./feeds");

const supportedFeeds = [
  FEED.systemInformation,
  FEED.stationInformation,
  FEED.stationStatus,
  FEED.freeBikeStatus,
  FEED.systemAlerts
];

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
      const providedFeeds = gbfs.data.en.feeds.filter(feed =>
        supportedFeeds.includes(feed.name)
      );

      if (providedFeeds.length === 0) {
        logger.warning(`No services discovered for ${this.serviceKey}`);
      }

      const feedPromises = providedFeeds.map(feed => {
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
        [this.serviceKey]: this.fullObject()
      });
    } catch (error) {
      logger.error(error);
    } finally {
      setTimeout(() => this.crawl({ name, url }), ttl || 60000);
    }
  }

  stations() {
    return this.feedCache[FEED.stationInformation].stations || [];
  }

  systemInformation() {
    return this.feedCache[FEED.systemInformation];
  }

  bikes(withIds = undefined) {
    const bikes = this.feedCache[FEED.freeBikeStatus].bikes;
    if (withIds !== undefined) {
      return bikes.filter(bike => withIds.includes(bike.bike_id));
    }
    return bikes;
  }

  systemAlerts() {
    return this.feedCache[FEED.systemAlerts].alerts;
  }

  fullObject() {
    const object = {
      systemInformation: () => this.systemInformation()
    };
    if (this.feeds[FEED.freeBikeStatus]) {
      object.bikes = ({ with_ids: withIds }) => {
        return this.bikes(withIds);
      };
    }

    if (this.feeds[FEED.stationInformation]) {
      object.stations = () => this.stations();
    }

    if (this.feeds[FEED.systemAlerts]) {
      object.systemAlerts = () => this.systemAlerts();
    }

    return object;
  }

  stationStatus(stationId) {
    const allStatus = this.feedCache[FEED.stationStatus].stations;
    const status = allStatus.find(
      s => s.station_id.toString() === stationId.toString()
    );
    return status || null;
  }

  systemAlertForStation(stationId) {
    const allSystemAlerts = this.feedCache[FEED.systemAlerts].alerts;
    const alerts = allSystemAlerts.filter(alert =>
      alert.station_ids.includes(stationId)
    );
    return alerts;
  }
}

module.exports = GBFS;
