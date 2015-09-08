var jwt = require('jsonwebtoken');
var _ = require('lodash');
var logger = require('./logger').FIDI.forModule(__filename);

var tokenDefaults = {
  algorithm: 'HS256',
  expiresInSeconds: parseInt(process.env.NODE_APP_TOKEN_EXPIRES, 10) * 1000
};

function generateToken(userId, payload) {
  logger.debug('Generating token.');

  var jwtOptions = _.cloneDeep(tokenDefaults);
  jwtOptions.issuer = userId;

  return jwt.sign(
    payload || {},
    process.env.NODE_APP_TOKEN_SECRET, jwtOptions
  );
}

function decodeToken(token) {
  logger.debug('Decoding token.');
  try {
    return jwt.verify(token, process.env.NODE_APP_TOKEN_SECRET, {
      algorithms: [tokenDefaults.algorithm]
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      var payload = jwt.decode(token);
      payload.expired = true;
      return payload;
    }
  }
  return false;
}

function parseAuthenticationToken(req, res, next) {
  var authHeader = req.get('Authorization');

  if (!authHeader || authHeader.indexOf('Bearer') !== 0) {
    logger.debug('Authorisation header not found. Skipping parsing.');
    return next();
  }
  req.FIDI = req.FIDI || {};
  req.FIDI.token = {};

  logger.debug('Authorisation header found. Parsing token.');

  req.FIDI.token.encoded = authHeader.slice(7);
  req.FIDI.token.decoded = decodeToken(req.FIDI.token.encoded);

  return next();
}

function requirePermissions(req, res, next) {
  if (!req.FIDI.token ||
    !req.FIDI.token.decoded ||
    req.FIDI.token.decoded.expired
  ) {
    var message = 'Not authorised.';
    logger.debug(message);
    res.FIDI.sendError(401, message);
    return next(new Error(message));
  }
  next();
}

module.exports = {
  generateToken: generateToken,
  decodeToken: decodeToken,
  parseAuthenticationToken: parseAuthenticationToken,
  requirePermissions: requirePermissions
};
