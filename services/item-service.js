'use strict';

let Promise = require('bluebird');
let request = Promise.promisifyAll(require('request'));
let cheerio = require('cheerio');
let moment = require('moment');
let db = require('../storage/db');
let injector = require('../decorators/injector');
let utilities = require('../helpers/utilities');
let logger = require('../decorators/logger').FIDI.forModule(__filename);
let _ = require('lodash');

/**
 * Given an ItemModel object, this service wrapper will perform certain async
 * tasks detailed below.
 * @param  {object} dependencies  expected values are listed below:
 * {
 *   emailSender: {
 *     instance: emailSenderInstance,
 *     default: false
 *   }
 * }
 * Where 'default' specifies if the instance should server as the default value
 * when an empty value is passed.
 * @return {Promise}              which gets resolve when all the async
 *                                operations are completed.
 */
module.exports = injector(
  function(dependencies, item) {
    if (!dependencies.emailSender) {
      throw new Error('An email sender instance is required.');
    }
    ItemService.emailSender = dependencies.emailSender;

    let itemService = new ItemService(item);

    let urlContentLoader = itemService.loadDataFromUrl()
      .bind(itemService)
      .then(itemService.parseDataFromUrl);

    return Promise.settle([
        urlContentLoader,
        itemService.loadUsersFullInfo()
      ])
      .return(itemService);
  }
);

function ItemService(item) {
  if (!item.url || !item.url.length) {
    throw new Error('The item must have a url set.');
  }
  this.item = item;
  this.content = null;
}

/**
 * Given an ItemModel, this method will fetch the content from the url found
 * in its url property.
 * @return {Promise}
 */
ItemService.prototype.loadDataFromUrl = function() {
  logger.debug('Loading document from url: ' + this.item.url);
  return request.getAsync(this.item.url)
    .bind(this)
    .spread(function(res, body) {
      this.content = body;
    })
    .catch(ex => {
      /* istanbul ignore next */
      logger.debug('Could not load url. Details: ' + ex);
    });
};

/**
 * Given an ItemModel, this method will fetch and populate all the user
 * details for all users in its users property.
 * @return {[type]} [description]
 */
ItemService.prototype.loadUsersFullInfo = function() {
  logger.debug('Loading users full info.');

  if (_.isEmpty(this.item.users)) {
    return Promise.resolve();
  }
  let ids = _.pluck(this.item.users, 'id');

  function populateUsersDetails(users) {
    let usersMap = new Map();
    users.forEach(function(user) {
      usersMap.set(user.id, user);
    });
    this.item.users.forEach(function(user) {
      user.email = usersMap.get(user.id).email;
    });
  }

  return db.users.getById(ids)
    .bind(this)
    .then(populateUsersDetails)
    .catch(ex => {
      /* istanbul ignore next */
      logger.debug('Could not load users. Details: ' + ex);
    });
};

/**
 * Given the HTML content of a page, this function will grab the text content
 * of the element matching the selector specified in ItemModel object's
 * selector property, will create a new snapshot of the item and will save the
 * item to the database.
 * @return {Promise}
 */
ItemService.prototype.parseDataFromUrl = function() {
  /* istanbul ignore next */
  if (_.isEmpty(this.item.selector)) {
    throw new Error('A selector was not found in the item.');
  }
  /* istanbul ignore next */
  if (_.isEmpty(this.content)) {
    throw new Error('The content is not available.');
  }
  let $ = cheerio.load(this.content);
  let contentOfPriceElement = $(this.item.selector).text();
  this.price = utilities.parsePrice(contentOfPriceElement);

  this.item.snapshots.push({
    date: moment(),
    price: this.price
  });

  return this.item.saveAsync();
};

ItemService.prototype.sendEmails = function() {
  logger.debug('Sending emails to users.');

  let self = this,
    item = this.item,
    lastSnapshot = item.snapshots[item.snapshots.length - 1],
    usersToNotify = getUsersToNotify();

  usersToNotify.forEach(function(user) {
    ItemService.emailSender.sendPriceNotification(
      user.email,
      self.item.url,
      self.price
    );
    saveUserLastSendDate(user);
  });

  function getUsersToNotify() {
    return _.filter(item.users, function(user) {
      return mustSendEmailToUser(user, lastSnapshot);
    });
  }

  function mustSendEmailToUser(user, lastSnapshot) {
    let emailsQuota = process.env.NODE_APP_EMAILS_QUOTA,
      isRightPrice = lastSnapshot.price <= user.maxPrice,
      isNotExcedingEmailsQuota = user.emailsSent < emailsQuota,
      dateAllows = isRightDate(user, lastSnapshot);
    return isRightPrice && isNotExcedingEmailsQuota && dateAllows;
  }

  function isRightDate(user, lastSnapshot) {
    if (!user.lastSent) {
      return true;
    }
    let aDayBeforeSnapshot = moment(lastSnapshot.date).subtract('1', 'days');
    return moment(user.lastSent) < aDayBeforeSnapshot;
  }

  function saveUserLastSendDate(user) {
    user.lastSent = moment();
    self.item.saveAsync();
  }

  return usersToNotify;
};
