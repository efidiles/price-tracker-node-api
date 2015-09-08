var appLogger = require('../helpers/logger');
var auth = require('http-auth');

var checkPermissions = (function checkPermissions() {
  var basic = auth.basic({
    realm: process.env.NODE_APP_REALM_ADMIN
  }, function(user, pass, next) {
    //TODO: better credentials
    appLogger.info('Checking admin user authentication');
    next(user === 'admin' && pass === 'admin');
  }
  );

  return auth.connect(basic);
}());

/**
 * Enables changing the logging error level dynamically
 */
function logger(req, res) {
  if (!appLogger.FIDI.changeLevel(req.body.level)) {
    res.sendStatus(500);
  }
  res.sendSuccess(req.body.level);
}

module.exports = {
  logger: logger,
  checkPermissions: checkPermissions
};
