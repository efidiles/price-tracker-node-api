var Promise = require('bluebird');
var mongoose = Promise.promisifyAll(require('mongoose'));

var UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  activated: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  }
});

UserSchema.virtual('created').get(created);

var ItemSchema = new mongoose.Schema({
  url: String,
  selector: String,
  snapshots: Array,
  users: Array
});

ItemSchema.virtual('created').get(created);

function created() {
  if (this['_created']) {
    return this['_created'];
  }
  return this['_created'] = this._id.getTimestamp();
}

ItemSchema.methods.hasUser = function(userId) {
  return this.users.indexOf(userId) !== -1;
};

module.exports = {
  user: UserSchema,
  item: ItemSchema
};
