var playjs = {};

playjs.DEBUG = false;
playjs.POST_MESSAGE = !!window.postMessage;

/*
* Utils.
*/
playjs.origin = function(url){
  // Grab the origin of a URL
  if (url.substr(0, 2) === '//'){
    url = window.location.protocol + url;
  }

  return url.split('/').slice(0,3).join('/');
};

playjs.addEvent = function(elem, type, eventHandle) {
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
playjs.log = function(){
  playjs.log.history = playjs.log.history || [];   // store logs to an array for reference
  playjs.log.history.push(arguments);
  if(window.console && playjs.DEBUG){
    window.console.log( Array.prototype.slice.call(arguments) );
  }
};

// isFunctions
playjs.isString = function (obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
};

playjs.isNone = function(obj){
  return (obj === null || obj === undefined);
};