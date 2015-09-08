require('env2')('config.env');
var db = require('../storage/db');
var expect = require('chai').expect;

describe('storage/db.js', function() {
  var usersFixtures = require('./fixtures/users');
  var itemsFixtures = require('./fixtures/items');
  process.env.NODE_APP_MONGO_TIMEOUT = 1.5;

  before(function(done) {
    db.connect(process.env.NODE_TEST_APP_MONGO_URL)
      .then(usersFixtures.load)
      .then(itemsFixtures.load)
      .then(function() {
        done();
      });
  });

  it('should getAllItems', function(done) {
    db.getAllItems()
      .then(function(items) {
        expect(items.length).to.equal(2);
        done();
      });
  });

  it('should getAllUsers', function(done) {
    db.getAllUsers()
      .then(function(users) {
        expect(users.length).to.equal(2);
        done();
      });
  });

  after(function() {
    db.clear();
    db.disconnect();
  });
});
