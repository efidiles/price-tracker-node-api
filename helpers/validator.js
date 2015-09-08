var validator = require('validator');

validator.FIDI = validator.FIDI || {};
validator.FIDI.isStrongPassword = function(str) {
  return str.length >= 9 &&
    hasSpecialCharacters &&
    hasNumber(str);


  function hasSpecialCharacters(str) {
    var iChars = '!@#$%^&*()+=-[]\';,./{}|":<>?~_';
    for (var i = 0, j = str.length; i < j; i++) {
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
