/*globals playerjs:true*/

// http://jplayer.org/latest/developer-guide/
playerjs.JPlayerAdapter = function(player){
  if (!(this instanceof playerjs.JPlayerAdapter)) {
    return new playerjs.JPlayerAdapter(player);
  }
  this.init(player);
};

playerjs.JPlayerAdapter.prototype.init = function(player){

  playerjs.assert(player, 'playerjs.JPlayerAdapter requires a player object');

  // Set up the actual receiver
  var receiver = this.receiver = new playerjs.Receiver();

  /* EVENTS */
  player.bind($.jPlayer.event.pause, function(event){
    receiver.emit('pause');
  });
  player.bind($.jPlayer.event.play, function(event) {
    receiver.emit('play');
  });
  player.bind($.jPlayer.event.timeupdate, function(event) {
    var status=event.jPlayer.status;
    var seconds = status.currentTime;
    var duration = status.duration;

    if (!seconds || !duration){
      return false;
    }

    var value = {
      seconds: seconds,
      duration: duration
    };
    receiver.emit('timeupdate', value);
  });
  player.bind($.jPlayer.event.ended, function(event) {
    receiver.emit('ended');
  });
  

  /* METHODS */
  receiver.on('play', function(){
    player.jPlayer('play');
  });

  receiver.on('pause', function(){
    player.jPlayer('pause');
  });

  receiver.on('getPaused', function(callback){
    callback(player.data("jPlayer").status.paused);
  });

  receiver.on('getCurrentTime', function(callback){
    callback(player.data("jPlayer").status.currentTime);
  });

  receiver.on('setCurrentTime', function(value){
    player.jPlayer("play", value);
  });

  receiver.on('getDuration', function(callback){
    callback(player.data("jPlayer").status.duration);
  });

  receiver.on('getVolume', function(callback){
    volume=player.data("jPlayer").options.volume * 100;
    callback(volume);
  });

  receiver.on('setVolume', function(value){
    value=value/100.0;
    player.jPlayer('option', 'volume', value);
  });

  receiver.on('mute', function(){
    player.jPlayer("mute");
  });

  receiver.on('unmute', function(){
    player.jPlayer("unmute");
  });

  receiver.on('getMuted', function(callback){
    callback(player.data("jPlayer").options.muted);
  });

  receiver.on('getLoop', function(callback){
    // callback(this.looped);
    callback(player.data("jPlayer").options.loop);
  });

  receiver.on('setLoop', function(value){
    player.data("jPlayer").options.loop = true;
  });
};

playerjs.JPlayerAdapter.prototype.ready = function(){
  this.receiver.ready();
};