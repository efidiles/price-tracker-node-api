var db = require('../../storage/db');
var Promise = require('bluebird');

/**
 * Assumes connection is done outside of the module
 */

var users = [
  db.users.create({
    _id: db.users.ObjectId('000000000000000000000001'),
    email: 'efidiles.public@gmail.com',
    password: 'test',
    activated: true
  }),
  db.users.create({
    _id: db.ObjectId('000000000000000000000002'),
    email: 'test1@example.org',
    password: 'test',
    activated: true
  })
];

function load() {
  var list = users.map(function(user) {
    return user.saveAsync();
  });
  return Promise.all(list);
}

function remove() {
  var list = users.map(function(user) {
    return user.removeAsync();
  });
  return Promise.all(list);
}

module.exports = {
  users: users,
  load: load,
  remove: remove
};
