require('env2')('config.env');
var should = require('should');
var request = require('supertest');
var Promise = require('bluebird');
var sinon = require('sinon');
var db = require('../storage/db');
var emailSender = require('../helpers/email-sender')();
process.env.NODE_APP_MONGO_TIMEOUT = 1;

describe('/api/activate', function() {

  function setup() {
    return new Promise(function(resolve) {
      db.connect(process.env.NODE_TEST_APP_MONGO_URL, function() {
        db.clear();
        app = require('../index')();
        resolve();
      });
      //disable the email activation during testing to avoid getting wrong status code
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

  it('should should reject the request if the token is invalid', function(done) {
    setup().then(registerUser);

    function registerUser() {
      request(app)
        .get('/api/activate/00000000-0000-0000-0000-000000000000')
        .expect(500)
        .end(function(err) {
          should.not.exist(err, 'did not get expected 500 status code');
          cleanSetup();
          done();
        });
    }
  });

  it('should activate the user if everything is correct', function(done) {
    var httpMocks = require('node-mocks-http');
    var req = httpMocks.createRequest();
    var res = httpMocks.createResponse();
    var jwt = require('../helpers/jwt');
    var registerRouteHandler = require('../routes/user').register;
    var user = {
      email: 'marktaylor@example.org',
      name: 'Mark Taylor',
      password: 'marktaylor'
    };
    req.body = user;
    sinon.stub(emailSender, 'sendActivationEmail', function(options, cb) {
      cb();
    });

    db.connect(process.env.NODE_TEST_APP_MONGO_URL, function() {
      db.clear();
      registerRouteHandler(req, res, onRegistrationCompleted);
    });

    function onRegistrationCompleted() {
      db.user.findOne({
        'email': user.email
      }).exec().then(function(user) {
        var token = jwt.getToken(user.id);
        var activationLink = emailSender.createActivationLink(token);
        activateUser(activationLink);
      });
    }

    function activateUser(activationLink) {
      var app = require('../index')();
      activationLink = '/api' + activationLink.split('/api')[1];
      request(app)
        .get(activationLink)
        .expect(200)
        .end(function(err) {
          testCleanup();
          should.not.exist(err, 'did not get expected 200 status code');
          done();
        });
    }

    function testCleanup() {
      //db.clear();
      db.disconnect();
      emailSender.sendActivationEmail.restore();
    }
  });

});
