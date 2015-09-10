'use strict';

let appLogger = require('../decorators/logger');
let auth = require('http-auth');
let db = require('../storage/db');

let checkPermissions = (function checkPermissions() {
  let basic = auth.basic({
    realm: process.env.NODE_APP_REALM_DEBUG
  }, function(user, pass, next) {
    appLogger.info('Checking debug user authentication');
    let isAllowed = user === process.env.NODE_APP_DEBUG_USER &&
      pass === process.env.NODE_APP_DEBUG_PASSWORD &&
      process.env.NODE_ENV === 'development';
    next(isAllowed);
  }
  );

  return auth.connect(basic);
}());

function ping(req, res, next) {
  res.sendStatus(200);
  return next();
}

function exec(req, res, next) {
  res.sendStatus(200);
  return next();
}

function redisFlush(req, res, next) {
  let redis = req.app.locals.redisClient;
  if (redis) {
    redis.flushall();
    appLogger.debug('redis flushed');
    res.status(200).json({
      'message': 'redis flushed'
    });
    return next();
  } else {
    appLogger.debug('redis not available');
    res.status(500).json({
      'message': 'redis not available'
    });
    return next();
  }
}

function dbClear(req, res, next) {
  db.clear();
  appLogger.debug('db cleared');
  res.status(200).json({
    'message': 'db cleared'
  });
  return next();
}

module.exports = {
  ping: ping,
  exec: exec,
  redisFlush: redisFlush,
  dbClear: dbClear,
  checkPermissions: checkPermissions
};
