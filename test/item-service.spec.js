require('env2')('config.env');
var expect = require('chai').expect;
var http = require('http');
var emailServiceMock = {
  sendPriceNotification: function() {}
};
var itemServiceConfig = require('../services/item-service');
var db = require('../storage/db');
var sinon = require('sinon');
var express = require('express');

describe('itemService', function() {
  var usersFixtures = require('./fixtures/users');
  var itemsFixtures = require('./fixtures/items');
  process.env.NODE_APP_MONGO_TIMEOUT = 1.5;

  before(function() {
    return db.connect(process.env.NODE_TEST_APP_MONGO_URL)
      .then(function() {
        db.clear();
      })
      .then(usersFixtures.load)
      .then(itemsFixtures.load);
  });

  it('should load content from url', function() {
    var app = express();

    app.get('/data', function(req, res) {
      res.setHeader('Content-Type', 'text/html');
      res.status(200)
        .send(
          '<html><body>' +
          '<h1>Product title</h1>' +
          '<p class="price">13.99</p>' +
          '</body></html>'
      );
    });

    var server = http.createServer(app).listen(9975);

    var item = db.items.create();
    item.url = 'http://127.0.0.1:9975/data';
    item.selector = '.price';
    item.users = [{
      id: "000000000000000000000001",
      maxPrice: 20
    }];
    //override save method to avoid saving to db
    item.save = function(cb) {
      return cb();
    };

    return itemServiceFactory(item)
      .then(function(itemService) {
        expect(itemService.price).to.equal(13.99);
        server.close();
      });

  });

  it('should grab the price from the markup', function() {
    var item = db.items.create();
    item.selector = '.price';
    //override save method to avoid saving to db
    item.save = function(cb) {
      return cb();
    };

    return itemServiceFactory(item, {
      content: '<div><span class="price">13.99</span></div>'
    })
      .then(function(itemService) {
        expect(itemService.price).to.equal(13.99);
      });

  });

  it('should convert commas to dots in the price value grabbed from markup', function() {
    var item = db.items.create();
    item.selector = '.price';
    //override save method to avoid saving to db
    item.save = function(cb) {
      return cb();
    };

    return itemServiceFactory(item, {
      content: '<div><span class="price">13,99</span></div>'
    })
      .then(function(itemService) {
        expect(itemService.price).to.equal(13.99);
      });
  });

  it('should strip non-digits from the price raw value grabbed from markup', function() {
    var item = new db.items.create();
    item.selector = '.price';
    //override save method to avoid saving to db
    item.save = function(cb) {
      return cb();
    };

    return itemServiceFactory(item, {
      content: '<div><span class="price">?13,99</span></div>'
    })
      .then(function(itemService) {
        expect(itemService.price).to.equal(13.99);
      });
  });

  it('should save a snapshot of the price after the content is loaded', function() {
    var item = new db.items.create();
    item.selector = '.price';
    //override save method to avoid saving to db
    item.save = function(cb) {
      return cb();
    };

    return itemServiceFactory(item, {
      content: '<div><span class="price">?13,99</span></div>'
    })
      .then(function(itemService) {
        expect(itemService.item.snapshots.length).to.equal(1);
      });
  });

  it('should send emails to users which track the item for a higher price', function() {
    var item = db.items.create();
    item.url = "http://example.org";
    item.selector = '.price';
    item.users = [
      {
        id: "000000000000000000000001",
        maxPrice: 20
      },
      {
        id: "000000000000000000000002",
        maxPrice: 12
      }
    ];
    //override save method to avoid saving to db
    item.save = function(cb) {
      return cb();
    };
    sinon.stub(emailServiceMock, 'sendPriceNotification', function(email, url, price) {
      expect(email).to.equal(usersFixtures.users[0].email);
    });

    return itemServiceFactory(item, {
      content: '<div><span class="price">?13,99</span></div>'
    })
      .then(function(itemService) {
        var users = itemService.sendEmails();
        expect(users[0].id).to.equal("000000000000000000000001");
      });
  });

  after(function() {
    db.clear();
    db.disconnect();
  });
});
