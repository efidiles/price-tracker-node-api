var config = require('./config');
var emailSender = require('nodemailer');
var Promise = require('bluebird');
var logger = require('./logger').FIDI.forModule(__filename);
var senderTransport;

/**
 * Sends an activation email. The function will send an email with
 * an activation url generated based on the token.
 * @param  {string} email
 * @param  {string} token
 * @return {Promise}
 */
function sendActivationEmail(email, token) {
  logger.debug('Sending activation email.');

  var activationUrl = createActivationLink(token);

  //TODO: make a better template
  var emailOptions = {
    from: process.env.NODE_APP_EMAILSENDER_EMAIL,
    to: email,
    subject: 'Activate your account',
    text: `Paste the following link in your browser to activate
          your account: ${activationUrl}`,
    html: `<p>Click the following button to activate your account:</p>
          <p><a href="${activationUrl}">Activate</a></p>`
  };

  return senderTransport.sendMailAsync(emailOptions);
}
/**
 * Sends an email to the user with the current price for an item (located at
 * the specified url)
 * @param  {string} email user's email
 * @param  {string} url   item's URL
 * @param  {float} price  item's price
 * @return {Promise}
 */
function sendPriceNotification(email, url, price) {
  logger.debug('Sending price notification email.');

  //TODO: make a better template
  var emailOptions = {
    from: process.env.NODE_APP_EMAILSENDER_EMAIL,
    to: email,
    subject: 'Buy your item now',
    text: `Your item is now selling for a price of: ${price}  price.\n
          Go to website to buy it: ${url}`,
    html: `<p>Your item is now selling for a price of:
            <strong>${price}</strong>
          </p>
          <p>Click <a href="${url}">here</a> to go to the website.</p>`
  };

  return senderTransport.sendMailAsync(emailOptions);
}

function createActivationLink(token) {
  return config.hostname + config.appRoutes.activate.fullPath + '/' + token;
}

module.exports = function(transporter) {
  if (!transporter) {
    throw new Error('Please provide the config options for the transporter.');
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
