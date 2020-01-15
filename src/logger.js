const debug = require('winston');

module.exports = (foreignModule) => {
  let name = foreignModule.id;
  name = name.split('/').pop();
  [name] = name.split('.');

  return debug(`ap7:${name}`);
};
