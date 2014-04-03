/*globals playerjs:true*/

playerjs.MockAdapter = function(){
  if (!(this instanceof playerjs.MockAdapter)) {
    return new playerjs.MockAdapter();
  }
  this.init();
};

playerjs.MockAdapter.prototype.init = function(){

  // Our mock video
  var video = {
    duration: 20,
    currentTime: 0,
    interval: null,
    timeupdate: function(){},
    volume: 100,
    mute: false,
    playing: false,
    loop : false,
    play: function(){
      video.interval = setInterval(function(){
        video.currentTime += 0.25;
        video.timeupdate({
          seconds: video.currentTime,
          duration: video.duration
        });
      }, 250);
      video.playing = true;
    },
    pause: function(){
      clearInterval(video.interval);
      video.playing = false;
    }
  };

  // Set up the actual receiver
  var receiver = this.receiver = new playerjs.Receiver();

  receiver.on('play', function(){
    var self = this;
    video.play();
    this.emit('play');
    video.timeupdate = function(data){
      self.emit('timeupdate', data);
    };
  });

  receiver.on('pause', function(){
    video.pause();
    this.emit('pause');
  });

  receiver.on('getPaused', function(callback){
    callback(!video.playing);
  });

  receiver.on('getCurrentTime', function(callback){
    callback(video.currentTime);
  });

  receiver.on('setCurrentTime', function(value){
    video.currentTime = value;
  });

  receiver.on('getDuration', function(callback){
    callback(video.duration);
  });

  receiver.on('getVolume', function(callback){
    callback(video.volume);
  });

  receiver.on('setVolume', function(value){
    video.volume = value;
  });

  receiver.on('mute', function(){
    video.mute = true;
  });

  receiver.on('unmute', function(){
    video.mute = false;
  });

  receiver.on('getMuted', function(callback){
    callback(video.mute);
  });

  receiver.on('getLoop', function(callback){
    callback(video.loop);
  });

  receiver.on('setLoop', function(value){
    video.loop = value;
  });
};

/* Call when the video has loaded */
playerjs.MockAdapter.prototype.ready = function(){
  this.receiver.ready();
};