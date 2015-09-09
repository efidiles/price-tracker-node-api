'use strict';

let created = function() {
  if (this['_created']) {
    return this['_created'];
  }
  return this['_created'] = this._id.getTimestamp();
};

module.exports = {
  virtualMethods: {
    created
  }
};
