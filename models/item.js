var mongoose = require('mongoose');

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

module.exports = ItemSchema;
