/*globals playerjs:true*/

playerjs.BetaJSAdapter = function(player){
    if (!(this instanceof playerjs.BetaJSAdapter)) {
        return new playerjs.BetaJSAdapter(player);
    }
    this.init(player);
};

playerjs.BetaJSAdapter.prototype.init = function(player){

    playerjs.assert(player, 'playerjs.BetaJSReceiver requires a player object');

    // Set up the actual receiver
    var receiver = this.receiver = new playerjs.Receiver();

    /* EVENTS */
    player.on("paused", function(){
        receiver.emit('pause');
    });

    player.on("playing", function(){
        receiver.emit('play');
    });

    player.on("change:position change:duration", function () {
        var seconds = player.get("position"),
            duration = player.get("duration");

        if (!seconds || !duration){
            return false;
        }

        var value = {
            seconds: seconds,
            duration: duration
        };
        receiver.emit('timeupdate', value);
    });

    player.on("ended", function(){
        receiver.emit('ended');
    });

    player.on("error", function(){
        receiver.emit('error');
    });


    /* METHODS */
    receiver.on('play', function(){
        player.play();
    });

    receiver.on('pause', function(){
        player.pause();
    });

    receiver.on('getPaused', function(callback){
        callback(!player.get("playing"));
    });

    receiver.on('getCurrentTime', function(callback){
        callback(player.get("position"));
    });

    receiver.on('setCurrentTime', function(value){
        player.seek(value);
    });

    receiver.on('getDuration', function(callback){
        callback(player.get("duration"));
    });

    receiver.on('getVolume', function(callback){
        callback(player.get("volume") * 100);
    });

    receiver.on('setVolume', function(value){
        player.set_volume(value/100);
    });

    receiver.on('mute', function(){
        player.set_volume(0);
    });

    receiver.on('unmute', function(){
        player.set_volume(1);
    });

    receiver.on('getMuted', function(callback){
        callback(player.get("volume") === 0);
    });

    receiver.on('getLoop', function(callback){
        callback(player.get("loop"));
    });

    receiver.on('setLoop', function(value){
        player.set("loop", value);
    });
};

/* Call when the beta.js is ready */
playerjs.BetaJSAdapter.prototype.ready = function(){
    this.receiver.ready();
};