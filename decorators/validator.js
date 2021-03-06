'use strict';

let validator = require('validator');

validator.FIDI = validator.FIDI || {};
validator.FIDI.isStrongPassword = function(str) {
  return str.length >= 9 &&
    hasSpecialCharacters &&
    hasNumber(str);


  function hasSpecialCharacters(str) {
    let iChars = '!@#$%^&*()+=-[]\';,./{}|":<>?~_';
    for (let i = 0, j = str.length; i < j; i++) {
      if (iChars.indexOf(str.charAt(i)) !== -1) {
        return true;
      }
    }
    return false;
  }

  function hasNumber() {
    return /\d+/g.test(str);
  }
};

module.exports = validator;
