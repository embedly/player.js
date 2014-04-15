/*globals playerjs:true*/

//http://www.longtailvideo.com/support/jw-player/28851/javascript-api-reference
playerjs.JWPlayerAdapter = function(player){
  if (!(this instanceof playerjs.JWPlayerAdapter)) {
    return new playerjs.JWPlayerAdapter(player);
  }
  this.init(player);
};

playerjs.JWPlayerAdapter.prototype.init = function(player){

  playerjs.assert(player, 'playerjs.JWPlayerAdapter requires a player object');

  // Set up the actual receiver
  var receiver = this.receiver = new playerjs.Receiver();

  // JWPlayer doesn't have a seLoop, so we can do it ourself.
  this.looped = false;

  /* EVENTS */
  player.onPause(function(){
    receiver.emit('pause');
  });

  player.onPlay(function(){
    receiver.emit('play');
  });

  player.onTime(function(e){
    var seconds = e.position,
      duration = e.duration;

    if (!seconds || !duration){
      return false;
    }

    var value = {
      seconds: seconds,
      duration: duration
    };
    receiver.emit('timeupdate', value);
  });

  var self = this;
  player.onComplete(function(){
    // Fake the looping
    if (self.looped === true){
      // By default jwplayer seeks after play.
      player.seek(0);
    } else {
      // Else throw the ended event.
      receiver.emit('ended');
    }
  });

  player.onError(function(){
    receiver.emit('error');
  });


  /* METHODS */
  receiver.on('play', function(){
    player.play(true);
  });

  receiver.on('pause', function(){
    player.pause(true);
  });

  receiver.on('getPaused', function(callback){
    callback(player.getState() !== 'PLAYING');
  });

  receiver.on('getCurrentTime', function(callback){
    callback(player.getPosition());
  });

  receiver.on('setCurrentTime', function(value){
    player.seek(value);
  });

  receiver.on('getDuration', function(callback){
    callback(player.getDuration());
  });

  receiver.on('getVolume', function(callback){
    callback(player.getVolume());
  });

  receiver.on('setVolume', function(value){
    player.setVolume(value);
  });

  receiver.on('mute', function(){
    player.setMute(true);
  });

  receiver.on('unmute', function(){
    player.setMute(false);
  });

  receiver.on('getMuted', function(callback){
    callback(player.getMute() === true);
  });

  receiver.on('getLoop', function(callback){
    callback(this.looped);
  }, this);

  receiver.on('setLoop', function(value){
    this.looped = value;
  }, this);
};

/* Call when the video.js is ready */
playerjs.JWPlayerAdapter.prototype.ready = function(){
  this.receiver.ready();
};
