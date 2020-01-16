const request = require('request-promise-native');
const FEED = require('./feeds');

const supportedFeeds = [
  FEED.systemInformation,
  FEED.stationInformation,
  FEED.stationStatus,
  FEED.freeBikeStatus,
];

class GBFS {
  constructor({ serviceKey, autoDiscoveryURL, pubsub }) {
    this.serviceKey = serviceKey;
    this.autoDiscoveryURL = autoDiscoveryURL;
    this.pubsub = pubsub;
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
      const providedFeeds = gbfs.data.en.feeds
        .filter((feed) => supportedFeeds.includes(feed.name));

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

      this.pubsub.publish(this.serviceKey, {
        [this.serviceKey]: this.fullObject(),
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

  bikes() {
    return this.feedCache[FEED.freeBikeStatus].bikes;
  }

  fullObject() {
    const object = {
      systemInformation: () => this.systemInformation(),
    };
    if (this.feeds[FEED.freeBikeStatus]) {
      object.bikes = () => this.bikes();
    }

    if (this.feeds[FEED.stationInformation]) {
      object.stations = () => this.stations();
    }
    return object;
  }

  stationStatus(stationId) {
    const allStatus = this.feedCache[FEED.stationStatus].stations;
    // eslint-disable-next-line eqeqeq
    const status = allStatus.find((s) => s.station_id == stationId);
    return status || null;
  }
}

module.exports = GBFS;
