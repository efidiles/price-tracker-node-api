require('env2')('config.env');
var appRoutes = require('../helpers/config').appRoutes;
var expect = require('chai').expect;
var request = require('supertest');
var emailServiceMock = {
  sendPriceNotification: function() {}
};
var db = require('../storage/db');

describe('/api/item', function() {
  var usersFixtures = require('./fixtures/users');
  var itemsFixtures = require('./fixtures/items');
  process.env.NODE_APP_MONGO_TIMEOUT = 1.5;

  before(function() {
    return db.connect(process.env.NODE_TEST_APP_MONGO_URL)
      .then(function() {
        db.clear();
      })
      .then(usersFixtures.load)
      .then(itemsFixtures.load)
      .catch(function(ex) {
        var message = "Can't connect to the database. Details: " + ex.stack;
        throw message;
      });
  });

  it('should check all the items and send email to users if ' +
    "there's a price match", function() {
    var app = require('../index')();

    app.get('/data/item-1', function(req, res) {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(
        '<html><body>' +
        '<h1>Product title</h1>' +
        '<p id="price">45.99</p>' +
        '</body></html>'
      );
    });
    app.get('/data/item-2', function(req, res) {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send('<html><body>' +
        '<h1>Product title</h1>' +
        '<p id="price">45.99</p>' +
        '</body></html>');
    });

    return request(app).get(appRoutes.itemCheck.fullPath)
      .expect(200)
      .end(function(err, res) {
        expect(res.body.data).to.equal(['000000000000000000000002']);
      });
  });

  after(function() {
    db.clear();
    db.disconnect();
  });
});
