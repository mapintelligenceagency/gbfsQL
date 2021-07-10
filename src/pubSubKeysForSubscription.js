const FEED = require('./feeds');

const KeyToFeed = {
  stations: [FEED.stationStatus, FEED.stationInformation, FEED.systemAlerts],
  bikes: [FEED.freeBikeStatus],
  systemInformation: [FEED.systemInformation],
  systemAlerts: [FEED.systemAlerts],
};

module.exports = (serviceKey, graphQLInformation) => {
  const topLevelQueriesOnService = graphQLInformation[3].operation
    .selectionSet.selections[0]
    .selectionSet.selections
    .map((selection) => selection.name.value);
  const keys = topLevelQueriesOnService.map((query) => KeyToFeed[query]).flat().filter((feed) => feed).map((feed) => `${serviceKey}.${feed}`);
  logger.info('will subscribe to keys', keys);
  return keys;
};
