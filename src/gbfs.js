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
      });

      await this.crawl();
    }
  }

  async crawl() {
    await Promise.all(Object.entries(this.feeds).map(async ([name, url]) => {
      const feedResponse = await request(url, { json: true });
      this.feedCache[name] = feedResponse;
    }));
  }

  stations() {
    const { stations } = this.feedCache[FEED.stationInformation].data;
    stations.forEach((s) => {
      // eslint-disable-next-line no-param-reassign
      s.SERVICEKEY = this.serviceKey;
    });
    return stations || [];
  }

  systemInformation() {
    return this.feedCache[FEED.systemInformation].data;
  }

  bikes() {
    return this.feedCache[FEED.freeBikeStatus].data.bikes;
  }

  stationStatus(stationId) {
    const allStatus = this.feedCache[FEED.stationStatus].data.stations;
    const status = allStatus.find((s) => s.station_id === stationId);
    return status || {};
  }
}

module.exports = GBFS;
