const FEED = require('./feeds');

const KeyToFeed = {
  stations: [FEED.stationStatus, FEED.stationInformation],
  bikes: [FEED.freeBikeStatus],
  systemInformation: [FEED.systemInformation],
};

module.exports = (serviceKey, graphQLInformation) => {
  const topLevelQueriesOnService = graphQLInformation[3].operation
    .selectionSet.selections[0]
    .selectionSet.selections
    .map((selection) => selection.name.value);
  const keys = topLevelQueriesOnService.map((query) => KeyToFeed[query]).flat().map((feed) => `${serviceKey}.${feed}`);
  logger.info(keys);
  return keys;
};
