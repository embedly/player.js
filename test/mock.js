// We need to create a mock iframe for testing proposes.

var eventListeners = {};

var addEvent = function(elem, type, eventHandle) {
  if (!elem) { return; }
  if ( elem.addEventListener ) {
    elem.addEventListener( type, eventHandle, false );
  } else if ( elem.attachEvent ) {
    elem.attachEvent( "on" + type, eventHandle );
  } else {
    elem["on"+type]=eventHandle;
  }
};

var send = function(data, listener){
  if (listener) {
    data.listener = listener;
  }

  window.parent.postMessage(JSON.stringify(data), '*');
};

var emit = function(event, data){
  if (!eventListeners.hasOwnProperty(event)){
    return false;
  }

  var listeners = eventListeners[event];
  for(var i = 0; i< listeners.length; i++){
    var l = listeners[i];
    var d = {
      event: event
    };
    if (l.listener){
      d.listener = l.listener;
    }
    if (data){
      d.data = l.data;
    }
    send(d);
  }
};

addEvent(window, 'message', function(e){
  var data = JSON.parse(e.data);

  if (data.method === 'addEventListener'){
    if (eventListeners.hasOwnProperty(data.event)){
      eventListeners[data.event].push(data);
    } else {
      eventListeners[data.event] = [data];
    }
  }

  switch (data.method) {
    case 'play':
      emit('play');
      emit('playProgress', {seconds: 20, duration:100});
      break;
    case 'pause':
      emit('pause');  break;
    case 'paused':
      send({
        event: 'paused',
        value: true
      }, data.listener);  break;
    case 'getDuration':
      send({
        event: 'getDuration',
        value: 100
      }, data.listener);  break;
    case 'getVolume':
      send({
        event: 'getVolume',
        value: 90
      }, data.listener);  break;
    case 'getCurrentTime':
      send({
        event: 'getCurrentTime',
        value: 10.1
      }, data.listener);  break;
  }
});


send({method:'isReady', event:'ready'});