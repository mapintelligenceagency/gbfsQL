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
      const providedFeeds = gbfs.data.en.feeds
        .filter((feed) => supportedFeeds.includes(feed.name));

      providedFeeds.forEach((feed) => {
        this.feeds[feed.name] = feed.url;
        console.log(`Found ${feed.name} for ${this.serviceKey}`);
        this.crawl(feed);
      });
    }
  }

  async crawl({ name, url }) {
    const feedResponse = await request(url, { json: true });
    this.feedCache[name] = feedResponse.data;
    const ttl = parseInt(feedResponse.ttl, 10) * 1000;
    setTimeout(() => this.crawl({ name, url }), ttl || 60000);
  }

  stations() {
    const { stations } = this.feedCache[FEED.stationInformation];
    stations.forEach((s) => {
      // eslint-disable-next-line no-param-reassign
      s.SERVICE = this;
    });
    return stations || [];
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
    return status || {};
  }
}

module.exports = GBFS;
