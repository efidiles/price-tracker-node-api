var config = require('./config');
var emailSender = require('nodemailer');
var Promise = require('bluebird');
var logger = require('./logger').FIDI.forModule(__filename);
var senderTransport;

function sendActivationEmail(options) {
  logger.debug('Sending activation email.');

  var activationUrl = createActivationLink(options.token);

  //TODO: make a better template
  var mailOptions = {
    from: process.env.NODE_APP_EMAILSENDER_EMAIL,
    to: options.email,
    subject: 'Activate your account',
    text: 'Click this link to activate your account: ' +
      activationUrl,
    html: '<p>Click this button to activate your account:</p>' +
      '<p><a href="' + activationUrl + '">Activate</a></p>'
  };

  return senderTransport.sendMailAsync(mailOptions);
}

function sendPriceNotification(email, url, price) {
  logger.debug('Sending price notification email.');

  //TODO: make a better template
  var mailOptions = {
    from: process.env.NODE_APP_EMAILSENDER_EMAIL,
    to: email,
    subject: 'Buy your item now',
    text: 'Your item is now selling for a price of: ' + price +
      '.\nGo to website to buy it: ' + url,
    html: '<p>Your item is now selling for a price of: <strong>' +
      price + '</strong></p>' +
      '<p>Click <a href="' + url + '">here</a> to go to the website.</p>'
  };

  return senderTransport.sendMailAsync(mailOptions);
}

function createActivationLink(token) {
  return config.hostname + config.appRoutes.activate.fullPath + '/' + token;
}

module.exports = function(transporter) {
  if (!transporter) {
    throw new Error('Please provide options for transporter in the ' +
      'constructor.');
  }

  senderTransport = Promise.promisifyAll(
    emailSender.createTransport(transporter)
  );

  return {
    sendActivationEmail: sendActivationEmail,
    createActivationLink: createActivationLink,
    sendPriceNotification: sendPriceNotification
  };
};
