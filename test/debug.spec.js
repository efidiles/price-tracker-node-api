require('env2')('config.env');
var request = require('supertest');
var should = require('should');

describe('/debug/exec', function() {
  it('should not be accessible if app is in production mode', function(done) {
    var oldVal = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    var app = require('../index')();

    request(app)
      .get('/debug/exec')
      .expect(404, function(err) {
        should.not.exist(err, 'did not received expected 404 status code');
        restoreState();
      });

    function restoreState() {
      process.env.NODE_ENV = oldVal;
      done();
    }
  });

  it('should be accessible if app is in development mode', function(done) {
    var oldVal = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    var app = require('../index')();

    request(app)
      .get('/debug/exec')
      .expect(401, function(err) {
        should.not.exist(err, 'did not received expected 401 status code');
        restoreState();
      });

    function restoreState() {
      process.env.NODE_ENV = oldVal;
      done();
    }
  });
});
