'use strict';

function setRegistration(user) {
  var key = 'user:' + user.id;
  this.set(key, user);
}

module.exports = function(client) {
  if (!client) {
    throw new Error('Please provide a redis client instance in the ' +
      'constructor.');
  }

  client.FIDI = {
    setRegistration: setRegistration.bind(client)
  };

  return client;
};
