'use strict';

module.exports = function(decoratedFunction) {
  let moduleDependencies;

  function returnFunction() {
    if (!moduleDependencies) {
      throw Error('Dependencies not set.');
    }
    var args = Array.prototype.slice.call(arguments);
    var argumentsToPass = [moduleDependencies].concat(args);
    return decoratedFunction.apply(null, argumentsToPass);
  }

  returnFunction.injectDependencies = function(dependencies) {
    moduleDependencies = dependencies;
  };

  returnFunction.clearDependencies = function() {
    moduleDependencies = null;
  };

  return returnFunction;
};
