var Promise = require('bluebird');
var mongoose = Promise.promisifyAll(require('mongoose'));
var models = require('../models');
var logger = require('../helpers/logger');
var users = items = {};

var UserModel = mongoose.model('user', models.user);
var ItemModel = mongoose.model('item', models.item);

function connect(url) {
  return new Promise(function(resolve, reject) {
    var connectedToDb = false;

    setTimeout(function connectionTimeout() {
      if (!connectedToDb) {
        var message = "Can't connect to the database";
        logger.debug(message);
        reject();
      }
    }, parseInt(process.env.NODE_APP_MONGO_TIMEOUT, 10) * 1000);

    mongoose.connect(url, function(err) {
      if (err) {
        reject();
      }
      connectedToDb = true;
      resolve();
    });
  });
}

function clear() {
  mongoose.connection.db.dropDatabase();
}

function disconnect() {
  mongoose.disconnect();
}

users.create = function(data) {
  return new UserModel(data);
};

users.getUserModels = function(ids) {
  return UserModel.find({
    _id: {
      $in: ids
    }
  }).execAsync();
};

users.getById = function() {
  return UserModel.findOne({
    _id: id
  }).execAsync();
};

users.getByEmail = function(email) {
  return UserModel.findOne({
    'email': email
  })
    .execAsync();
};

users.getAll = function() {
  return UserModel.find()
    .execAsync();
};

items.create = function(data) {
  return new ItemModel(data);
};

items.remove = function(itemId, userId) {
  return ItemModel.updateAsync(
    {
      _id: itemId
    },
    {
      $pull: {
        users: {
          id: userId
        }
      }
    }
  );
};

items.getById = function(id) {
  return ItemModel.find({
    _id: id
  })
    .execAsync();
};

items.getAll = function() {
  return ItemModel.find()
    .execAsync();
};

items.getByUrl = function(url) {
  return ItemModel.find({
    url: url
  })
    .execAsync();
};
items.addUserModel = function(itemId, userId, maxPrice) {
  return ItemModel.updateAsync({
    _id: itemId
  }, {
    $push: {
      users: {
        id: userId,
        maxPrice: maxPrice
      }
    }
  });
};

module.exports = {
  connect: connect,
  clear: clear,
  disconnect: disconnect,
  items: items,
  users: users,
  ObjectId: mongoose.Types.ObjectId
};
