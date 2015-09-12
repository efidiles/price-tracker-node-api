require('env2')('config.env');
var Promise = require('bluebird');
var expect = require('chai').expect;
var http = require('http');
var itemService = require('../services/item-service');
var db = require('../storage/db');
var sinon = require('sinon');
var express = require('express');
var moment = require('moment');
var nock = require('nock');
var usersFixtures = require('./fixtures/users');
var itemsFixtures = require('./fixtures/items');
var emailServiceMock = {
  sendPriceNotification: function() {}
};
Promise.longStackTraces();
process.env.NODE_APP_MONGO_TIMEOUT = 1.5;

describe('itemService', function() {
  before(function() {
    nock.disableNetConnect();
  });
  after(function() {
    nock.enableNetConnect();
  });

  var thisTest = {
    mockItem: function(data) {
      var item = new db.items.create(data);

      //override save method to avoid saving to db
      item.save = function(cb) {return cb();};
      return item;
    },
    mockEndpointWithResponse: function(content) {
      nock('http://localhost')
        .get('/data')
        .reply(200, content);
    }
  }

  context('dependencies available', function() {
    before(function() {
      return db.connect(process.env.NODE_TEST_APP_MONGO_URL)
        .then(function() {
          db.clear();
        })
        .then(usersFixtures.load)
        .then(itemsFixtures.load);
    });

    after(function() {
      db.clear();
      db.disconnect();
    });

    beforeEach(function() {
      itemService.injectDependency({
        emailSender: emailServiceMock
      });
    });

    afterEach(function() {
      itemService.clearDependencies();
      nock.cleanAll();
    });

    it('should load content from url', function() {
      thisTest.mockEndpointWithResponse(
        '<html><body>' +
        '<h1>Product title</h1>' +
        '<p id="price">13.99</p>' +
        '</body></html>'
      );

      var item = thisTest.mockItem({
        url: 'http://localhost/data',
        selector: '#price'
      });

      return itemService(item)
        .then(function(itemService) {
          expect(itemService.price).to.equal(13.99);
        });
    });

    it('should grab the price from the markup', function() {
      thisTest.mockEndpointWithResponse(
        '<div><span id="price">13.99</span></div>'
      );

      var item = thisTest.mockItem({
        url: 'http://localhost/data',
        selector: '#price'
      });

      return itemService(item)
        .then(function(itemService) {
          expect(itemService.price).to.equal(13.99);
        });
    });

    it('should convert commas to dots in the price value grabbed from markup',
      function() {
        thisTest.mockEndpointWithResponse(
          '<div><span id="price">13,99</span></div>'
        );

        var item = thisTest.mockItem({
          url: 'http://localhost/data',
          selector: '#price'
        });

        return itemService(item)
          .then(function(itemService) {
            expect(itemService.price).to.equal(13.99);
          });
      });

    it('should strip non-digits from the price raw value grabbed from markup',
      function() {
        thisTest.mockEndpointWithResponse(
          '<div><span id="price">$13,99</span></div>'
        );

        var item = thisTest.mockItem({
          url: 'http://localhost/data',
          selector: '#price'
        });

        return itemService(item)
          .then(function(itemService) {
            expect(itemService.price).to.equal(13.99);
          });
      });

    it('should save a snapshot of the price after the content is loaded',
      function() {
        thisTest.mockEndpointWithResponse(
          '<div><span id="price">13.99</span></div>'
        );

        var item = thisTest.mockItem({
          url: 'http://localhost/data',
          selector: '#price'
        });

        return itemService(item)
          .then(function(itemService) {
            expect(itemService.item.snapshots.length).to.equal(1);
          });
      });

    it('should send emails to users who match the price criteria',
      function() {
        thisTest.mockEndpointWithResponse(
          '<div><span id="price">13.99</span></div>'
        );

        var item = thisTest.mockItem({
          url: 'http://localhost/data',
          selector: '#price',
          users: [
            {
              id: "000000000000000000000001",
              maxPrice: 20,
              emailsSent: 0
            },
            {
              id: "000000000000000000000002",
              maxPrice: 12,
              emailsSent: 0
            }
          ]
        });

        return itemService(item)
          .then(function(itemService) {
            var users = itemService.sendEmails();
            expect(users.length).to.equal(1);
            expect(users[0].id).to.equal("000000000000000000000001");
          });
      });

    it('should not send more than an email per day',
      function() {
        thisTest.mockEndpointWithResponse(
          '<div><span id="price">13.99</span></div>'
        );

        var item = new db.items.create();
        item.url = 'http://localhost/data';
        item.selector = '#price';
        item.users = [
          {
            id: "000000000000000000000001",
            maxPrice: 20,
            lastSent: Date('2015-09-08T11:32:21.196Z'),
            emailsSent: 0
          }
        ];
        //override save method to avoid saving to db
        item.save = function(cb) {
          return cb();
        };

        return itemService(item)
          .then(function(itemService) {
            item.snapshots[0].date = Date('2015-09-09T01:32:21.196Z');
            var users = itemService.sendEmails();
            expect(users.length).to.equal(0);
          });
      });

    it("should reset emails counter once the price exceds the user's max price",
      function (done) {
        thisTest.mockEndpointWithResponse(
          '<div><span id="price">30.00</span></div>'
          );

        var item = thisTest.mockItem({
          url: 'http://localhost/data',
          selector: '#price',
          users: [
            {
              id: "000000000000000000000001",
              maxPrice: 20,
              lastSent: moment('2015-09-08T11:32:21.196Z'),
              emailsSend: 2
            }
          ]
        });

        return itemService(item)
          .then(function(itemService) {
            var users = itemService.sendEmails();
            expect(item.users[0].emailsSent).to.equal(0);
          });
      });
  });

  it('should throw an error if dependencies are not available', function() {
    itemService.injectDependency({});
    expect(itemService.bind(null)).to.throw(
      /email sender instance is required/
    );
  });

  it("should throw error if the item doesn't have a url set",
    function () {
      itemService.injectDependency({
        emailSender: emailServiceMock
      });
      var item = thisTest.mockItem();
      expect(itemService.bind(null, item)).to.throw(/item must have a url set/);
      itemService.clearDependencies();
  });

  it('should throw error if content could not be fetched from url',
    function () {
      itemService.injectDependency({
        emailSender: emailServiceMock
      });

      var notFoundResponse = nock('http://localhost')
        .get('/not-found')
        .reply(500);

      var item = thisTest.mockItem({
        url: 'http://localhost/not-found',
        selector: "#price"
      });

      return itemService(item)
        .finally(function() {
          nock.cleanAll();
        })
        .catch(function(ex) {
          expect(ex).to.contain('content is not available');
          itemService.clearDependencies();
        });
  });

  it('should throw an error if the item does not have a selector',
    function () {
      itemService.injectDependency({
        emailSender: emailServiceMock
      });

      var notFoundResponse = nock('http://localhost')
        .get('/not-found')
        .reply(200, '<div><span id="price">13.99</span></div>');

      var item = thisTest.mockItem({
        url: 'http://localhost/not-found',
        selector: "#price"
      });

      return itemService(item)
        .finally(function() {
          nock.cleanAll();
        })
        .catch(function(ex) {
          expect(ex).to.contain('selector was not found');
          itemService.clearDependencies();
        });
  });
});
