  if (typeof define === 'function' && define.amd) {
    define(function () {
      return playerjs
    })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = playerjs
  } else {
    window.playerjs = playerjs;
  }
})(window, document);
