require('env2')('config.env');
var should = require('should');
var request = require('supertest');
var Promise = require('bluebird');
var emailSender = require('../facades/email-sender');
var db = require('../storage/db');
var sinon = require('sinon');
process.env.NODE_APP_MONGO_TIMEOUT = 1.5;

describe('/api/register', function() {
  var app;
  var user = {
    email: 'marktaylor@example.org',
    name: 'Mark Taylor',
    password: 'marktaylor'
  };

  function setup() {
    return new Promise(function(resolve) {
      db.connect(process.env.NODE_TEST_APP_MONGO_URL, function() {
        db.clear();
        app = require('../index')();
        resolve();
      });
      //disable the email activation during testing to avoid getting
      //wrong status code
      sinon.stub(emailSender, 'sendActivationEmail', function(options, cb) {
        cb();
      });
    });
  }

  function cleanSetup() {
    db.clear();
    db.disconnect();
    emailSender.sendActivationEmail.restore();
  }

  it('should allow registration using correct data', function(done) {
    setup().then(function() {
      request(app)
        .post('/api/register')
        .type('json')
        .send(JSON.stringify(user))
        .expect(200, function(err) {
          should.not.exist(err);
          cleanSetup();
          done();
        });
    });
  });

  it('should send an email if registration is successful', function(done) {
    setup().then(registerUser);

    function registerUser() {
      request(app)
        .post('/api/register')
        .type('json')
        .send(JSON.stringify(user))
        .expect(200, end);
    }

    function end(err) {
      should.not.exist(err);
      should(emailSender.sendActivationEmail.called).be.ok();
      cleanSetup();
      done();
    }
  });

  it('should not allow duplicate records', function(done) {
    setup().then(function() {
      request(app)
        .post('/api/register')
        .type('json')
        .send(JSON.stringify(user))
        .expect(200, function(err) {
          should.not.exist(err);
          next();
        });

      function next() {
        request(app)
          .post('/api/register')
          .type('json')
          .send(JSON.stringify(user))
          .expect(500, function(err) {
            should.not.exist(err);
            cleanSetup();
            done();
          });
      }
    });
  });

  it('should fail if mandatory fields are not provided', function(done) {
    setup().then(testBadRequest);

    function testBadRequest() {
      request(app)
        .post('/api/register')
        .type('json')
        .expect(400, end);
    }

    function end() {
      cleanSetup();
      done();
    }
  });

  it('should block too many connections coming from the same ip',
    function(done) {
      var redis = require('redis');
      var localRedis = require('../storage/redis');
      var limiter = require('../facades/express-limiter');
      localRedis.client = redis.createClient(
        process.env.NODE_TEST_APP_REDIS_PORT,
        process.env.NODE_TEST_APP_REDIS_HOST
      );
      localRedis.client.on('error', function(err) {
        throw ("Can't connect to Redis. Details:  " + err);
      });
      localRedis.client.flushall();

      db.connect(process.env.NODE_TEST_APP_MONGO_URL, function() {
        db.clear();

        limiter({
          total: 3,
          expire: 1000 * 5,
          enabled: true
        });

        app = require('../index')();

        request(app)
          .post('/api/register')
          .type('json')
          .expect(400)
          .end(function(err) {
            should.not.exist(err);
            second();
          });

        function second() {
          request(app)
            .post('/api/register')
            .type('json')
            .expect(400)
            .end(function(err) {
              should.not.exist(err);
              third();
            });
        }

        function third() {
          request(app)
            .post('/api/register')
            .type('json')
            .expect(429, testCleanup);
        }

        function testCleanup(err) {
          limiter({
            total: 50,
            expiry: 1000 * 60 * 60,
            enabled: false
          });
          localRedis.client = null;
          db.clear();
          db.disconnect();
          should.not.exist(err);
          done();
        }
      }
    );
  });

  it.skip('should validate the fields', function() {});

  it.skip('should encrypt the password before storing in the database',
    function() {}
  );

  it.skip('should delete the user if activation email was ' +
    'not sent successfully', function() {}
  );

});
