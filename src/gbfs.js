const request = require('request-promise-native');

const supportedFeeds = ['system_information', 'station_information', 'station_status'];

class GBFS {
  constructor(serviceKey, endpoint) {
    this.serviceKey = serviceKey;
    this.endpoint = endpoint;
    this.feeds = {};
    this.feedCache = {};
    if (endpoint) {
      request(endpoint, { json: true }).then((gbfs) => {
        const providedFeeds = gbfs.data.en.feeds
          .filter((feed) => supportedFeeds.includes(feed.name));

        providedFeeds.forEach((feed) => {
          this.feeds[feed.name] = feed.url;
          console.log(`Found ${feed.name} for ${serviceKey}`);
        });
      }).then(() => {
        this.crawl();
      });
    }
  }

  crawl() {
    Object.entries(this.feeds).forEach(([name, url]) => {
      request(url, { json: true }).then((feedResponse) => {
        this.feedCache[name] = feedResponse;
      });
    });
  }

  stations() {
    const { stations } = this.feedCache.station_information.data;
    stations.forEach((s) => {
      // eslint-disable-next-line no-param-reassign
      s.SERVICEKEY = this.serviceKey;
    });
    return stations || [];
  }

  systemInformation() {
    return this.feedCache.system_information.data;
  }

  stationStatus(stationId) {
    const allStatus = this.feedCache.station_status.data.stations;
    const status = allStatus.find((s) => s.station_id === stationId);
    return status || {};
  }
}

module.exports = GBFS;
