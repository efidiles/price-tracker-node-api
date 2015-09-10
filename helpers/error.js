'use strict';

let logger = require('../decorators/logger').FIDI.forModule(__filename);

function uncaughtErrorsHandler(err, req, res, next) {
  logger.error('Handle uncaught error.');
  logger.error(err.stack);
  next();
}

module.exports = {
  uncaughtErrorsHandler: uncaughtErrorsHandler,
  allowedErrorsFactory: function(allowedErrors) {
    return {
      isAllowedToReport: function(errorName) {
        return allowedErrors.indexOf(errorName) !== -1;
      }
    };
  }
};
