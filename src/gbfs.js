const request = require('request-promise-native');
const FEED = require('./feeds');

const supportedFeeds = [
  FEED.systemInformation,
  FEED.stationInformation,
  FEED.stationStatus,
  FEED.freeBikeStatus,
];

class GBFS {
  constructor(serviceKey, endpoint) {
    this.serviceKey = serviceKey;
    this.endpoint = endpoint;
    this.feeds = {};
    this.feedCache = {};
  }

  async load() {
    if (this.endpoint) {
      const gbfs = await request(this.endpoint, { json: true });
      if (!gbfs) {
        logger.error(`Request to ${this.endpoint} was not successful`);
        process.exit(1);
      }
      const providedFeeds = gbfs.data.en.feeds
        .filter((feed) => supportedFeeds.includes(feed.name));

      providedFeeds.forEach((feed) => {
        this.feeds[feed.name] = feed.url;
        logger.info(`Found ${feed.name} for ${this.serviceKey}`);
        this.crawl(feed);
      });
      if (providedFeeds.length === 0) {
        logger.warning(`No services discovered for ${this.serviceKey}`);
      }
    }
  }

  async crawl({ name, url }) {
    let ttl;
    try {
      const feedResponse = await request(url, { json: true });
      this.feedCache[name] = feedResponse.data;
      ttl = parseInt(feedResponse.ttl, 10) * 1000;
      logger.info(`Fetched ${name} for ${this.serviceKey} at ${url}`);
    } catch (error) {
      logger.error(`Failed to fetch ${url}: %o`, error);
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

  stationStatus(stationId) {
    const allStatus = this.feedCache[FEED.stationStatus].stations;
    // eslint-disable-next-line eqeqeq
    const status = allStatus.find((s) => s.station_id == stationId);
    return status || null;
  }
}

module.exports = GBFS;
