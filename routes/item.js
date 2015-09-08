var _ = require('lodash');
var logger = require('../helpers/logger');
var db = require('../storage/db');
var validator = require('../helpers/validator');
var itemServiceFactory = require('../helpers/item-service');
var allowedErrors = require('../helpers/error').allowedErrorsFactory([
  'AlreadyTrackingItem',
  'NotFound'
]);

function add(req, res, next) {
  logger.debug('Inside /item/add middleware');

  if (!validator.isURL(req.body.url)) {
    res.FIDI.sendError(400, 'The url provided is not valid.' +
      req.body.url, true);
    return next();
  }

  if (!validator.isFloat(req.body.maxPrice) || req.body.maxPrice < 0) {
    res.FIDI.sendError(400, 'The maximum price value is not valid.', true);
    return next();
  }

  if (!req.body.selector) {
    res.FIDI.sendError(400, 'A price selector must be provided.', true);
    return next();
  }

  var selector = validator.escape(req.body.selector);

  db.items.getByUrl(req.body.url)
    .then(function(item) {
      if (item.length) {
        logger.debug('Item exists. Adding user to item.');
        return addUserToExistingItem(item[0]);
      } else {
        logger.debug("Item doesn't exists. Creating new item.");
        return addNewItem();
      }
    })
    .then(function() {
      res.FIDI.sendSuccess('Item added.', true);
      return next();
    })
    .catch(function(ex) {
      logger.debug(ex);
      if (ex.name && allowedErrors.isAllowedToReport(ex.name)) {
        res.FIDI.sendError(400, ex.message, true);
        return next();
      }
      res.FIDI.sendError(500, 'Operational error occurred.', true);
      return next();
    });

  function addUserToExistingItem(item) {
    if (userIsAlreadyTrackingItem()) {
      throw {
        name: 'AlreadyTrackingItem',
        message: 'The item is already tracked by the user.'
      };
    }

    function userIsAlreadyTrackingItem() {
      return _.filter(item.users,
          {
            id: req.FIDI.token.decoded.iss
          }).length > 0;
    }

    return db.items.addUser(item.id, req.FIDI.token.decoded.iss,
      req.body.maxPrice);
  }

  function addNewItem() {
    var item = new db.items.create({
      url: req.body.url,
      selector: selector
    });

    item.users.push({
      id: req.FIDI.token.decoded.iss,
      maxPrice: req.body.maxPrice
    });

    return item.saveAsync();
  }
}

function remove(req, res, next) {
  logger.debug('Inside /item/remove middleware');

  db.items.getById(req.body.id)
    .then(checkItem)
    .then(db.items.remove.bind(
      null,
      req.body.id,
      req.FIDI.token.decoded.iss
    )
  )
    .then(function() {
      res.FIDI.sendSuccess('Item was removed.', true);
      return next();
    })
    .catch(function(ex) {
      logger.debug(ex);
      if (ex.name && allowedErrors.isAllowedToReport(ex.name)) {
        var code = 400;
        if (ex.name === 'NotFound') {
          code = 404;
        }
        res.FIDI.sendError(code, ex.message, true);
        return next();
      }
      res.sendError(500, 'Error occurred.', true);
      return next();
    });

  function checkItem(item) {
    item = item[0];
    if (!item) {
      throw {
        name: 'NotFound',
        message: 'Item was not found.'
      };
    }
    if (!item.hasUser(req.FIDI.token.decoded.iss)) {
      throw {
        name: 'NotFound',
        message: 'The user is not tracking the item.'
      };
    }
    return item;
  }
}

function check(req, res, next) {
  db.items.getAll()
    .map(itemServiceFactory)
    .each(function(itemService) {
      itemService.sendEmails();
    })
    .then(function() {
      res.FIDI.sendSuccess('Checking is completed.', true);
      return next();
    })
    .catch(function(ex) {
      logger.debug(ex);
      res.FIDI.sendError(500, 'Operational error occurred.', true);
      return next();
    });

    // function createItemServices(item) {
    //   return itemServiceFactory(item);
    // }
}

module.exports = {
  add: add,
  remove: remove,
  check: check
};
