'use strict';

let mongoose = require('mongoose');
let common = require('./common');

let ItemSchema = new mongoose.Schema({
  url: String,
  selector: String,
  snapshots: Array,
  users: Array
});

ItemSchema.virtual('created').get(common.created);

ItemSchema.methods.hasUser = function(userId) {
  return this.users.indexOf(userId) !== -1;
};

module.exports = ItemSchema;
