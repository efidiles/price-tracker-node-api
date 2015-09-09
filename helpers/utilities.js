'use strict';

let Promise = require('bluebird');
let bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'));
let logger = require('./logger').FIDI.forModule(__filename);

function getPrice(str) {
  let onlyDot = str.replace(',', '.');
  let onlyDigits = onlyDot.replace(/[^\d.]/g, '');
  return parseFloat(onlyDigits);
}

function encryptPassword(password) {
  logger.debug('Encrypting password.');
  return bcrypt.hashAsync(password, null, null);
}
function checkPassword(password, hash) {
  logger.debug('Checking password.');
  return bcrypt.compareAsync(password, hash);
}

module.exports = {
  getPrice: getPrice,
  encryptPassword: encryptPassword,
  checkPassword: checkPassword
};
