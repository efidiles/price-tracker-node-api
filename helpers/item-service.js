var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
var cheerio = require('cheerio');
var db = require('../storage/db');
var utilities = require('./utilities');
var logger = require('./logger').FIDI.forModule(__filename);
var _ = require('lodash');

module.exports = function(emailSender) {
  if (!emailSender) {
    throw new Error('An email sender instance is required.');
  }

  function ItemService(item) {
    this.item = item;
    this.content = null;
  }

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

  ItemService.prototype.loadUsersFullInfo = function() {
    logger.debug('Loading users full info.');
    var ids = _.pluck(this.item.users, 'id');

    return db.getUsers(ids)
      .bind(this)
      .then(populateUsersDetails)
      .catch(function(ex) {
        logger.debug('Could not load users. Details: ' + ex);
      });

    function populateUsersDetails(users) {
      var _users = {};
      users.forEach(function(user) {
        _users[user.id] = user;
      });
      this.item.users.forEach(function(user) {
        user.email = _users[user.id].email;
      });
    }
  };

  ItemService.prototype.parseData = function() {
    if (!this.content) {
      throw new Error('The content is not available.');
    }
    if (!this.item.selector) {
      throw new Error('The selector is not available.');
    }
    var $ = cheerio.load(this.content);
    var contentOfPriceElement = $(this.item.selector).text();
    this.price = utilities.getPrice(contentOfPriceElement);

    this.item.snapshots.push({
      date: Date(),
      price: this.price
    });

    return this.item.saveAsync();
  };

  ItemService.prototype.sendEmails = function() {
    logger.debug('Sending emails to users.');

    var self = this,
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
      var isRightPrice = lastSnapshot.price <= user.maxPrice,
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

  return function(item, options) {
    var itemService = new ItemService(item);
    var returnPromise;

    //if content is not then load the content and users info in parallel
    if (!options || !options.content) {
      returnPromise = Promise.settle([
          itemService.loadDataFromUrl(),
          itemService.loadUsersFullInfo()
        ]);
    } else {
      itemService.content = options.content;
      returnPromise = itemService.loadUsersFullInfo().bind(itemService);
    }

    return returnPromise.bind(itemService)
      .then(itemService.parseData)
      .return(itemService);
  };
};