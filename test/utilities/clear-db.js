require('env2')('config.env');
var db = require('../../storage/db');
process.env.NODE_APP_MONGO_TIMEOUT = 1.5;

db.connect(process.env.NODE_TEST_APP_MONGO_URL)
  .then(function() {
    db.clear();
    db.disconnect();
    console.log('Test db cleared.');
  });
