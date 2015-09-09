'use strict';

let _ = require('lodash');
let winston = require('winston');
let path = require('path');

let errors = {
  tryingToSetNonexistentLevel: 'You are trying to set a nonexistent ' +
    'error level: %s!'
};

let consoleTransport = new (winston.transports.Console)();

let logger = new (winston.Logger)({
  transports: [consoleTransport],
  level: process.env.NODE_APP_ERROR_LEVEL
});

winston.handleExceptions(consoleTransport);

function changeLoggingLevel(level) {
  if (!winston.config.syslog.levels.hasOwnProperty(level)) {
    logger.warn(errors.tryingToSetNonexistentLevel, level);
    return false;
  }

  _.forEach(logger.transports, function(transport) {
    transport.level = level;
  });

  return true;
}

logger.FIDI = {
  changeLevel: changeLoggingLevel,
  forModule: function(filepath) {
    let filename = path.basename(filepath);
    return {
      debug: function(message) {
        logger.debug('From ' + filename + ': ' + message);
      }
    };
  }
};

module.exports = logger;
