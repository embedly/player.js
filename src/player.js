/*globals playjs:true*/
/*
* Player.js is a javascript library for interacting with iframes via
* postMessage that use an Open Player Spec
*
*/

playjs.Player = function(elem, options){
  this.init(elem, options);
};

playjs.Player.EVENTS = {
  PLAY: 'play',
  PAUSE: 'pause',
  FINISH: 'finish',
  SEEK: 'seek',
  PLAY_PROGRESS: 'playProgress',
  LOAD_PROGRESS: 'loadProgress' // Not implemented yet.
};

playjs.Player.prototype.init = function(elem, options){

  if (playjs.isString(elem)){
    elem = document.getElementById(elem);
  }

  this.elem = elem;

  // Figure out the origin of where we are sending messages.
  this.origin = playjs.origin(elem.src);

  // Event handling.
  this.keeper = new playjs.Keeper();

  // Queuing before ready.
  this.isReady = false;
  this.queue = [];

  if (playjs.POST_MESSAGE){
    // Set up the reciever.
    var self = this;
    playjs.addEvent(window, 'message', function(e){
      self.receive(e);
    });
  } else {
    playjs.log('Post Message is not Available.');
  }
};

playjs.Player.prototype.send = function(data, callback, ctx){
  // We are expecting a response.
  if (callback) {
    // Create a UUID
    var id = this.keeper.getUUID();

    // Set the listener.
    data.listener = id;

    // Only hang on to this listener once.
    this.keeper.one(id, data.method, callback, ctx);
  }

  if (!this.isReady && data.event !== 'ready'){
    playjs.log('Player.queue', data);
    this.queue.push(data);
    return false;
  }

  playjs.log('Player.send', data, this.origin);
  this.elem.contentWindow.postMessage(JSON.stringify(data), this.origin);
  return true;
};

playjs.Player.prototype.receive = function(e){
  playjs.log('Player.receive', e);

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


playjs.Player.prototype.ready = function(){

  if (this.isReady === true){
    return false;
  }

  // set ready.
  this.isReady = true;

  // Clear the queue
  for (var i=0; i<this.queue.length; i++){
    var data = this.queue[i];

    playjs.log('Player.dequeue', data);

    if (data.event === 'ready'){
      this.keeper.execute(data.event, data.listener, true);
    }
    this.send(data);
  }
  this.queue = [];
};

playjs.Player.prototype.on = function(event, callback, ctx){
  var id = this.keeper.getUUID();

  if (event === 'ready'){
    // We only want to call ready once.
    this.keeper.one(id, event, callback, ctx);
  } else {
    this.keeper.on(id, event, callback, ctx);
  }

  this.send({
    method: 'addEventListener',
    event: event,
    listener: id
  });

  return true;
};

playjs.Player.prototype.off = function(event, callback){

  var listeners = this.keeper.off(event, callback);
  playjs.log('Player.off', listeners);

  if (listeners.length > 0) {
    for (var i in listeners){
      this.send({
        method: 'removeEventListener',
        event: event,
        listener: listeners[i]
      });
      return true;
    }
  }

  return false;
};

playjs.Player.prototype.play = function(){
  this.send({
    method: 'play'
  });
};

playjs.Player.prototype.pause = function(){
  this.send({
    method: 'pause'
  });
};

playjs.Player.prototype.isPaused = function(callback, ctx){
  this.send({
    method: 'isPaused'
  }, callback, ctx);
};

playjs.Player.prototype.mute = function(){
  this.send({
    method: 'mute'
  });
};

playjs.Player.prototype.unmute = function(){
  this.send({
    method: 'unmute'
  });
};

playjs.Player.prototype.isMuted = function(callback, ctx){
  this.send({
    method: 'isMuted'
  }, callback, ctx);
};

playjs.Player.prototype.getVolume = function(callback, ctx){
  this.send({
    method: 'getVolume'
  }, callback, ctx);
};

playjs.Player.prototype.setVolume = function(value){
  this.send({
    method: 'setVolume',
    value: value
  });
};

playjs.Player.prototype.getDuration = function(callback, ctx){
  this.send({
    method: 'getDuration'
  }, callback, ctx);
};

playjs.Player.prototype.seekTo = function(value){
  this.send({
    method: 'seekTo',
    value: value
  });
};

playjs.Player.prototype.getCurrentTime = function(callback, ctx){
  this.send({
    method: 'getCurrentTime'
  }, callback, ctx);
};

//Set the global player.
window.Player = function(elem, options){
  return new playjs.Player(elem, options);
};
