'use strict';

let logger = require('./logger');

module.exports = function responseHelpers(req, res, next) {
  res.FIDI = {
    sendError: function(statusCode, message, log) {
      if (log) {
        logger.debug(message);
      }
      let body = {
        message: message
      };
      res.status(statusCode).json(body);
    },
    sendSuccess: function(data, log) {
      if (log) {
        logger.debug(data);
      }
      if (typeof data === 'string') {
        data = {
          message: data
        };
      }
      res.status(200).json(data);
    }
  };
  next();
};
