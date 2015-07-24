var playerjs = {};

playerjs.DEBUG = false;
playerjs.VERSION = '0.0.11';
playerjs.CONTEXT = 'player.js';
playerjs.POST_MESSAGE = !!window.postMessage;

/*
* Utils.
*/
playerjs.origin = function(url){
  // Grab the origin of a URL
  if (url.substr(0, 2) === '//'){
    url = window.location.protocol + url;
  }

  return url.split('/').slice(0,3).join('/');
};

playerjs.addEvent = function(elem, type, eventHandle) {
  if (!elem) { return; }
  if ( elem.addEventListener ) {
    elem.addEventListener( type, eventHandle, false );
  } else if ( elem.attachEvent ) {
    elem.attachEvent( "on" + type, eventHandle );
  } else {
    elem["on"+type]=eventHandle;
  }
};

// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
playerjs.log = function(){
  playerjs.log.history = playerjs.log.history || [];   // store logs to an array for reference
  playerjs.log.history.push(arguments);
  if(window.console && playerjs.DEBUG){
    window.console.log( Array.prototype.slice.call(arguments) );
  }
};

// isFunctions
playerjs.isString = function (obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
};

playerjs.isObject = function(obj){
  return Object.prototype.toString.call(obj) === "[object Object]";
};

playerjs.isArray = function(obj){
  return Object.prototype.toString.call(obj) === "[object Array]";
};

playerjs.isNone = function(obj){
  return (obj === null || obj === undefined);
};

playerjs.has = function(obj, key){
  return Object.prototype.hasOwnProperty.call(obj, key);
};

// ie8 doesn't support indexOf in arrays, based on underscore.
playerjs.indexOf = function(array, item) {
  if (array == null){ return -1; }
  var i = 0, length = array.length;
  if (Array.prototype.IndexOf && array.indexOf === Array.prototype.IndexOf) {
    return array.indexOf(item);
  }
  for (; i < length; i++) {
    if (array[i] === item) { return i; }
  }
  return -1;
};

// Assert
playerjs.assert = function(test, msg) {
  if (!test) {
    throw msg || "Player.js Assert Failed";
  }
};