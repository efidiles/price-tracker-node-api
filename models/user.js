'use strict';

let mongoose = require('mongoose');
let moment = require('moment');
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
    default: moment()
  },
  lastPasswordChange: {
    type: Date,
    default: moment()
  }
});

UserSchema.virtual('created').get(common.virtualMethods.created);

module.exports = UserSchema;
