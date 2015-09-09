'use strict';

let mongoose = require('mongoose');
let common = require('./common');

let UserSchema = new mongoose.Schema({
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

UserSchema.virtual('created').get(common.virtualMethods.created);

module.exports = UserSchema;
