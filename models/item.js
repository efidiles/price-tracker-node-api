'use strict';

let mongoose = require('mongoose');
let common = require('./common');
let _ = require('lodash');

let ItemSchema = new mongoose.Schema({
  url: String,
  selector: String,
  snapshots: Array,
  users: Array
});

ItemSchema.virtual('created').get(common.virtualMethods.created);

ItemSchema.methods.isTrackedByUser = function(userId) {
  return _.find(item.users, 'id', userId) !== undefined;
};

module.exports = ItemSchema;
