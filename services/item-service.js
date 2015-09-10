'use strict';

let Promise = require('bluebird');
let request = Promise.promisifyAll(require('request'));
let cheerio = require('cheerio');
let db = require('../storage/db');
let utilities = require('./utilities');
let logger = require('./logger').FIDI.forModule(__filename);
let _ = require('lodash');
let defaults = {
  emailSender: null
};

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
module.exports = function(dependencies) {
  dependencies = _.assign({
    emailSender: {
      instance: null,
      default: false
    }
  }, dependencies);

  if (dependencies.emailSender.instance && dependencies.emailSender.default) {
    defaults.emailSender = dependencies.emailSender.instance;
  }

  let emailSender = dependencies.emailSender.instance || defaults.emailSender;

  if (!emailSender) {
    throw new Error('An email sender instance is required.');
  }

  function ItemService(item) {
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
      .then(function(res) {
        this.content = res[1];
      })
      .catch(function(ex) {
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
    let ids = _.pluck(this.item.users, 'id');

    return db.users.getById(ids)
      .bind(this)
      .then(populateUsersDetails)
      .catch(function(ex) {
        logger.debug('Could not load users. Details: ' + ex);
      });

    function populateUsersDetails(users) {
      let usersMap = new Map();
      users.forEach(function(user) {
        usersMap.set(user.id, user);
      });
      this.item.users.forEach(function(user) {
        user.email = usersMap.get(user.id).email;
      });
    }
  };

  /**
   * Given the HTML content of a page, this function will grab the text content
   * of the element matching the selector specified in ItemModel object's
   * selector property, will create a new snapshot of the item and will save the
   * item to the database.
   * @return {Promise}
   */
  ItemService.prototype.parseDataFromUrl = function() {
    if (!this.content) {
      throw new Error('The content is not available.');
    }
    if (!this.item.selector) {
      throw new Error('The selector is not available.');
    }
    let $ = cheerio.load(this.content);
    let contentOfPriceElement = $(this.item.selector).text();
    this.price = utilities.parsePrice(contentOfPriceElement);

    this.item.snapshots.push({
      date: Date(),
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
      emailSender.sendPriceNotification(
        user.email,
        self.item.url,
        self.price
      );
      saveUserLastSendDate(user);
    });

    function getUsersToNotify() {
      return _.filter(item.users, function(user) {
        return mustSendToUser(user, lastSnapshot);
      });
    }

    function mustSendToUser(user, lastSnapshot) {
      let isRightPrice = lastSnapshot.price <= user.maxPrice,
        isRightDate = false;

      if (!user.lastDate) {
        isRightDate = true;
      } else if (Date(user.lastSent) < Date(lastSnapshot.date)) {
        isRightDate = true;
      }

      return isRightPrice && isRightDate;
    }

    function saveUserLastSendDate(user) {
      user.lastSent = Date();
      self.item.saveAsync();
    }

    return usersToNotify;
  };

  return function(item) {
    let itemService = new ItemService(item);

    let urlContentLoader = itemService.loadDataFromUrl()
      .bind(itemService)
      .then(itemService.parseDataFromUrl);

    return Promise.settle([
        urlContentLoader,
        itemService.loadUsersFullInfo()
      ])
      .return(itemService);
  };
};
