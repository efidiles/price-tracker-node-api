require('env2')('config.env');
var Promise = require('bluebird');
var db = require('../../storage/db');
var usersFixtures = require('../fixtures/users');
var itemsFixtures = require('../fixtures/items');

db.connect(process.env.NODE_TEST_APP_MONGO_URL)
  .then(function() {
    db.clear();
  })
  .then(usersFixtures.load)
  .then(itemsFixtures.load)
  .then(function() {
    console.log('All done.');
    db.disconnect();
  });
