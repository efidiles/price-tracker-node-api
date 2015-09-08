var logger = require('./logger');
var _ = require('lodash');
var appRoutes = require('./config').appRoutes;
var expressLimiter = require('express-limiter');
var config = {
  total: 50, //set min 3 because there's a bug in the package
  expire: 1000 * 60 * 60
};

module.exports = function(options) {
  _.assign(config, options);

  return function(app, redisClient) {
    if (!app || !redisClient) {
      logger.warn('Limiter is not enabled');
      return;
    }

    var limiter = expressLimiter(app, redisClient);

    limiter({
      path: appRoutes.register.fullPath,
      method: 'post',
      lookup: ['connection.remoteAddress'],
      total: config.total,
      expire: config.expire
    });
  };
};
