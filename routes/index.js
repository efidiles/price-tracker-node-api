var admin = require('./admin');
var debug = require('./debug');
var user = require('./user');
var item = require('./item');

function checkPermissions(req, res, next) {
  if (!req.FIDI.token || !req.FIDI.token.decoded) {
    req.sendStatus(401);
  }
  next();
}

module.exports = {
  user: user,
  admin: admin,
  debug: debug,
  item: item,
  checkPermissions: checkPermissions
};
