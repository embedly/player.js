/*globals playerjs:true*/
/*
* Player.js is a javascript library for interacting with iframes via
* postMessage that use an Open Player Spec
*
*/

playerjs.Player = function(elem, options){
  this.init(elem, options);
};

playerjs.EVENTS = {
  PLAY: 'play',
  PAUSE: 'pause',
  ENDED: 'ended',
  SEEKED: 'seeked',
  TIMEUPDATE: 'timeupdate',
  PROGRESS: 'progress', // Not implemented yet.
  ERROR: 'error' // Not implemented yet.
};

playerjs.METHODS = [
  'play',
  'pause',
  'getPaused',
  'mute',
  'unmute',
  'getMuted',
  'setVolume',
  'getVolume',
  'getDuration',
  'setCurrentTime',
  'getCurrentTime',
  'setLoop',
  'getLoop',
  'removeEventListener',
  'addEventListener'
];

playerjs.READIED = [];

playerjs.Player.prototype.init = function(elem, options){

  var self = this;

  if (playerjs.isString(elem)){
    elem = document.getElementById(elem);
  }

  this.elem = elem;

  // Figure out the origin of where we are sending messages.
  this.origin = playerjs.origin(elem.src);

  // Event handling.
  this.keeper = new playerjs.Keeper();

  // Queuing before ready.
  this.isReady = false;
  this.queue = [];

  if (playerjs.POST_MESSAGE){
    // Set up the reciever.
    playerjs.addEvent(window, 'message', function(e){
      self.receive(e);
    });
  } else {
    playerjs.log('Post Message is not Available.');
  }

  // See if we caught the src event first, otherwise assume we haven't loaded
  if (playerjs.READIED.indexOf(elem.src) > -1){
    self.loaded = true;
  } else {
    // Try the onload event, just lets us give another test.
    this.elem.onload = function(){
      self.loaded = true;
    };
  }
};

playerjs.Player.prototype.send = function(data, callback, ctx){
  // We are expecting a response.
  if (callback) {
    // Create a UUID
    var id = this.keeper.getUUID();

    // Set the listener.
    data.listener = id;

    // Only hang on to this listener once.
    this.keeper.one(id, data.method, callback, ctx);
  }

  if (!this.isReady && data.value !== 'ready'){
    playerjs.log('Player.queue', data);
    this.queue.push(data);
    return false;
  }

  playerjs.log('Player.send', data, this.origin);

  if (this.loaded === true){
    this.elem.contentWindow.postMessage(JSON.stringify(data), this.origin);
  }

  return true;
};

playerjs.Player.prototype.receive = function(e){
  playerjs.log('Player.receive', e);

  if (e.origin !== this.origin){
    return false;
  }

  var data;
  try {
    data = JSON.parse(e.data);
  } catch (err){
    // Not a valid response.
    return false;
  }

  // We need to determine if we are ready.
  if (data.event === 'ready'){
    this.ready();
  }

  if (this.keeper.has(data.event, data.listener)){
    this.keeper.execute(data.event, data.listener, data.value);
  }
};


playerjs.Player.prototype.ready = function(){

  if (this.isReady === true){
    return false;
  }

  // set ready.
  this.isReady = true;
  this.loaded = true;

  // Clear the queue
  for (var i=0; i<this.queue.length; i++){
    var data = this.queue[i];

    playerjs.log('Player.dequeue', data);

    if (data.event === 'ready'){
      this.keeper.execute(data.event, data.listener, true);
    }
    this.send(data);
  }
  this.queue = [];
};

playerjs.Player.prototype.on = function(event, callback, ctx){
  var id = this.keeper.getUUID();

  if (event === 'ready'){
    // We only want to call ready once.
    this.keeper.one(id, event, callback, ctx);
  } else {
    this.keeper.on(id, event, callback, ctx);
  }

  this.send({
    method: 'addEventListener',
    value: event,
    listener: id
  });

  return true;
};

playerjs.Player.prototype.off = function(event, callback){

  var listeners = this.keeper.off(event, callback);
  playerjs.log('Player.off', listeners);

  if (listeners.length > 0) {
    for (var i in listeners){
      this.send({
        method: 'removeEventListener',
        value: event,
        listener: listeners[i]
      });
      return true;
    }
  }

  return false;
};

playerjs.Player.prototype.play = function(){
  this.send({
    method: 'play'
  });
};

playerjs.Player.prototype.pause = function(){
  this.send({
    method: 'pause'
  });
};

playerjs.Player.prototype.getPaused = function(callback, ctx){
  this.send({
    method: 'getPaused'
  }, callback, ctx);
};

playerjs.Player.prototype.mute = function(){
  this.send({
    method: 'mute'
  });
};

playerjs.Player.prototype.unmute = function(){
  this.send({
    method: 'unmute'
  });
};

playerjs.Player.prototype.getMuted = function(callback, ctx){
  this.send({
    method: 'getMuted'
  }, callback, ctx);
};

playerjs.Player.prototype.getVolume = function(callback, ctx){
  this.send({
    method: 'getVolume'
  }, callback, ctx);
};

playerjs.Player.prototype.setVolume = function(value){
  this.send({
    method: 'setVolume',
    value: value
  });
};

playerjs.Player.prototype.getDuration = function(callback, ctx){
  this.send({
    method: 'getDuration'
  }, callback, ctx);
};

playerjs.Player.prototype.setCurrentTime = function(value){
  this.send({
    method: 'setCurrentTime',
    value: value
  });
};

playerjs.Player.prototype.getCurrentTime = function(callback, ctx){
  this.send({
    method: 'getCurrentTime'
  }, callback, ctx);
};

playerjs.Player.prototype.setLoop = function(value){
  this.send({
    method: 'getLoop',
    value: value
  });
};

playerjs.Player.prototype.getLoop = function(callback, ctx){
  this.send({
    method: 'getLoop'
  }, callback, ctx);
};

window.playerjs = playerjs;

// We need to catch all ready events in case the iframe is ready before the
// player is invoked.
playerjs.addEvent(window, 'message', function(e){
  var data;
  try {
    data = JSON.parse(e.data);
  } catch (err){
    return false;
  }

  // We need to determine if we are ready.
  if (data.event === 'ready' && data.value.src){
    playerjs.READIED.push(data.value.src);
  }
});
