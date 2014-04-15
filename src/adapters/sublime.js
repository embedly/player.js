/*globals playerjs:true*/

playerjs.SublimeAdapter = function(player){
  if (!(this instanceof playerjs.SublimeAdapter)) {
    return new playerjs.SublimeAdapter(player);
  }
  this.init(player);
};

// Subset of methods available.
playerjs.SublimeAdapter.prototype.events = [
  playerjs.EVENTS.READY,
  playerjs.EVENTS.PLAY,
  playerjs.EVENTS.PAUSE,
  playerjs.EVENTS.ENDED,
  playerjs.EVENTS.TIMEUPDATE,
  playerjs.EVENTS.ERROR
];

playerjs.SublimeAdapter.prototype.methods = [
  playerjs.METHODS.PLAY,
  playerjs.METHODS.PAUSE,
  playerjs.METHODS.GETDURATION,
  playerjs.METHODS.SETCURRENTTIME,
  playerjs.METHODS.GETCURRENTTIME,
  playerjs.METHODS.REMOVEEVENTLISTENER,
  playerjs.METHODS.ADDEVENTLISTENER
];

playerjs.SublimeAdapter.prototype.init = function(player){

  playerjs.assert(player, 'playerjs.SublimeAdapter requires a player object');

  // Set up the actual receiver
  var receiver = this.receiver = new playerjs.Receiver(this.events, this.methods);

  /* EVENTS */
  player.on("pause", function(){
    receiver.emit('pause');
  });

  player.on("play", function(){
    receiver.emit('play');
  });

  player.on("timeUpdate", function(player, seconds){
    var duration = player.duration();

    if (!seconds || !duration){
      return false;
    }

    var value = {
      seconds: seconds,
      duration: duration
    };
    receiver.emit('timeupdate', value);
  });

  player.on("end", function(){
    receiver.emit('ended');
  });

  /* METHODS */
  receiver.on('play', function(){
    player.play();
  });

  receiver.on('pause', function(){
    player.pause();
  });

  receiver.on('getCurrentTime', function(callback){
    callback(player.playbackTime());
  });

  receiver.on('setCurrentTime', function(value){
    player.seekTo(value);
  });

  receiver.on('getDuration', function(callback){
    callback(player.duration());
  });
};

/* Call when the video.js is ready */
playerjs.SublimeAdapter.prototype.ready = function(){
  this.receiver.ready();
};
