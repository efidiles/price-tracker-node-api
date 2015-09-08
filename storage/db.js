var Promise = require('bluebird');
var mongoose = Promise.promisifyAll(require('mongoose'));
var models = require('../models');
var logger = require('../helpers/logger');

var User = mongoose.model('user', models.user);
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

function createUser(data) {
  return new User(data);
}

function getUsers(ids) {
  return User.find({
    _id: {
      $in: ids
    }
  }).execAsync();
}

function getUserById(id) {
  return User.findOne({
    _id: id
  }).execAsync();
}

function getUserByEmail(email) {
  return User.findOne({
    'email': email
  })
    .execAsync();
}

function getAllUsers() {
  return User.find()
    .execAsync();
}

var users = {};

users.getById = function() {
  return User.findOne({
    _id: id
  }).execAsync();
};

var items = {};

items.create = function(data) {
  return new ItemModel(data);
};

items.removeUser = function(itemId, userId) {
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
items.addUser = function(itemId, userId, maxPrice) {
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
  createUser: createUser,
  getUserById: getUserById,
  getUsers: getUsers,
  getUserByEmail: getUserByEmail,
  getAllUsers: getAllUsers,
  items: items,
  clear: clear,
  disconnect: disconnect,
  ObjectId: mongoose.Types.ObjectId
};
