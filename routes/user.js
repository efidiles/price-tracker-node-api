'use strict';

let jwtHelper = require('../facades/jwt');
let moment = require('moment');
let logger = require('../decorators/logger');
let utilities = require('../helpers/utilities');
let db = require('../storage/db');
let validator = require('../decorators/validator');
let allowedErrors = require('../helpers/error').allowedErrorsFactory([
  'NotFound',
  'DuplicateFound'
]);


function login(req, res, next) {
  logger.debug('Inside /login middleware');

  if (!validator.isEmail(req.body.email)) {
    res.FIDI.sendError(401, 'Invalid credentials.', true);
    return next();
  }
  if (!req.body.password) {
    res.FIDI.sendError(401, 'The password is required.', true);
    return next();
  }

  logger.debug('Checking email.');
  db.getByEmail(req.body.email, true)
    .then(checkPassword)
    .then(updateUserLastLogin)
    .then(setToken)
    .then(function(token) {
      logger.debug('Successfully logged in.');
      res.FIDI.sendSuccess({
        token: token
      });
      return next();
    })
    .catch(ex => {
      logger.debug(ex);
      if (ex.name && allowedErrors.isAllowedToReport(ex.name)) {
        res.FIDI.sendError(400, ex.message, true);
        return next();
      }
      res.FIDI.sendError(500, 'Operational error occurred.', true);
      return next();
    });

  function checkPassword(user) {
    logger.debug('Checking password.');
    if (!user) {
      throw new Error('User was not found.');
    }
    return utilities.checkPassword(req.body.password, user.password)
      .then(function(isValidPassword) {
        if (!isValidPassword) {
          throw new Error('Invalid password.');
        }
        return user;
      });
  }

  function updateUserLastLogin(user) {
    logger.debug("Updating user's last login date.");
    user.lastLogin = moment();
    return user.saveAsync().get(0);
  }

  function setToken(user) {
    logger.debug('Generating the token.');

    let tokenPayload = {
      ll: user.lastLogin,
      lpc: user.lastPasswordChange
    };
    return jwtHelper.generateToken(user.id, tokenPayload);
  }
}

function activate(req, res, next) {
  logger.debug('Inside /activate middleware');

  /**
   * The token needs to be decoded here because in the activation process
   * the token is not sent in the Authorisation header but in the query string
   */
  let decodedToken = jwtHelper.decodeToken(req.params.token);

  if (!decodedToken) {
    res.FIDI.sendError(500, 'Invalid token.', true);
    return next();
  }

  db.users.getById(decodedToken.iss)
    .then(checkUser)
    .then(activateUser)
    .then(function() {
      res.FIDI.sendSuccess('User is now active.', true);
      next();
    })
    .catch(ex => {
      logger.debug(ex);
      if (ex.name && allowedErrors.isAllowedToReport(ex.name)) {
        let code = 400;
        if (ex.name === 'NotFound') {
          code = 404;
        }
        res.FIDI.sendError(code, ex.message, true);
        return next();
      }
      res.sendError(400, 'Error occurred.', true);
      return next();
    });

  function checkUser(user) {
    logger.debug('Checking user.');
    if (!user) {
      throw {
        name: 'NotFound',
        message: "User doesn't exist."
      };
    }
    return user;
  }

  function activateUser(user) {
    logger.debug('Activating user.');
    user.activated = true;
    return user.saveAsync();
  }
}

function register(req, res, next) {
  logger.debug('Inside /register middleware.');

  if (!validator.isEmail(req.body.email)) {
    res.sendStatus(400, 'Invalid email provided.', true);
    return next();
  }

  if (!validator.FIDI.isStrongPassword(req.body.password)) {
    res.FIDI.sendError(400, "Password doesn't match strength criteria.", true);
    return next();
  }

  db.getByEmail(req.body.email)
    .then(checkForDuplicates)
    .then(utilities.encryptPassword)
    .then(createUser)
    .then(sendActivationEmail)
    .then(function() {
      res.FIDI.sendSuccess('User has been registered.', true);
      next();
    })
    .catch(ex => {
      logger.debug(ex);
      if (ex.name && allowedErrors.isAllowedToReport(ex.name)) {
        res.FIDI.sendError(400, ex.message, true);
        return next();
      }
      res.FIDI.sendError(500, 'An error occurred.', true);
      next();
    });

  function checkForDuplicates(_user) {
    logger.debug('Checking for duplicates.');
    if (_user) {
      throw {
        name: 'DuplicateFound',
        message: 'The email is already registered.'
      };
    }
    return req.body.password;
  }

  function createUser(hashedPassword) {
    logger.debug('Creating user.');
    let user = db.users.create();
    user.email = req.body.email;
    user.password = hashedPassword;
    if (!req.app.locals.emailSender) {
      logger.debug('Email sender is disabled. Setting user active ' +
        'by default.');
      user.activated = true;
    }
    return user.saveAsync().get(0);
  }

  function sendActivationEmail(user) {
    if (!req.app.locals.emailSender) {
      logger.debug('Email sender is disabled. No activation email sent.');
      return;
    }

    let emailActivationToken = jwtHelper.generateToken(user.id);
    return req.app.locals.emailSender.sendActivationEmail(
        user.email,
        emailActivationToken
    ).then(function() {
      logger.debug('Activation email sent.');
    });
  }
}

function refreshToken(req, res, next) {
  logger.debug('Inside /token/refresh middleware.');

  if (!req.FIDI.token || !req.FIDI.token.decoded) {
    res.FIDI.sendError(401, 'Invalid token.', true);
    return next();
  }

  let tokenData = req.FIDI.token.decoded;

  if (!tokenData.expired) {
    res.FIDI.sendError(400, "Token hasn't expired yet.", true);
    return next();
  }

  if (lastLoginIsTooOld()) {
    res.FIDI.sendError(
      401,
      'Last login is too old. Re-login is needed.',
      true
    );
    return next();
  }

  let newToken = jwtHelper.generateToken(tokenData.iss, {
    ll: tokenData.ll,
    lpc: tokenData.lpc
  });

  logger.debug('Token has been refreshed.');

  res.FIDI.sendSuccess({
    token: newToken
  });

  function lastLoginIsTooOld() {
    let maxLoginDateInThePast = moment().subtract(
      process.env.NODE_APP_TOKEN_LOGIN_VALID_PERIOD,
      'milliseconds'
    );
    return maxLoginDateInThePast.isAfter(tokenData.ll);
  }

  return next();
}

module.exports = {
  activate: activate,
  register: register,
  login: login,
  refreshToken: refreshToken
};
