require('env2')('config.env');
var should = require('should');
var request = require('supertest');
var db = require('../storage/db');
process.env.NODE_APP_MONGO_TIMEOUT = 1;

describe('/api/login', function() {
  var app;

  function setup(cb) {
    db.connect(process.env.NODE_TEST_APP_MONGO_URL, function() {
      db.clear();
      app = require('../index')();
      cb();
    });
  }

  function cleanSetup() {
    db.clear();
    db.disconnect();
  }

  it('should reject if the email is not provided', function(done) {
    var user = {
      email: 'test@example.org'
    };
    request(app)
      .post('/api/login')
      .type('json')
      .send(user)
      .expect(400, function(err) {
        should.not.exist(err);
        cleanSetup();
        done();
      });
  });

  it.skip('should block too many connections coming from the same ip',
    function(done) {});

  it.skip('should meet minim password strength criteria', function(done) {});

});
