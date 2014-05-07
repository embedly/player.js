/*globals asyncTest:true, ok:true, fail:true, start:true, playerjs:true*/
var FRAMES = [
  'http://localhost.com:8003/test/mock.html',
  'http://localhost.com:8003/test/html.html',
  'http://localhost.com:8003/test/video.html',
  'http://localhost.com:8003/test/sublime.html',
  'http://localhost.com:8003/test/jwplayer.html'
];

var isNumber= function(obj){
  return Object.prototype.toString.call(obj) === "[object Number]";
};

var removeEvent = function(elem, type, eventHandle) {
  if (!elem) { return; }
  if ( elem.removeEventListener ) {
    elem.removeEventListener( type, eventHandle, false );
  } else if ( elem.detachEvent ) {
    elem.detachEvent( "on" + type, eventHandle );
  } else {
    elem["on"+type]=null;
  }
};

function testCases(){
  var player = this;

  asyncTest("Play", 3, function() {
    var count = 0;
    var done = function(){
      count ++;
      if (count === 2){
        // Revert us back to the opening bell.
        player.setCurrentTime(0);
        player.pause();
        start();
      }
    };

    player.on('play', function(){
      ok(true, "video has played");
      this.off('play');
      done();
    });

    player.on('timeupdate', function(data){
      ok(isNumber(data.seconds));
      ok(isNumber(data.duration));

      this.off('timeupdate');
      done();
    });

    player.play();
  });

  asyncTest("Pause", 1, function() {
    player.on('pause', function(){
      ok(true, "video has paused");
      this.off('pause');
      start();
    });

    // We won't fire pause unless we are actually playing first.
    player.on('play', function(){
      player.off('play');
      player.pause();
    });

    player.play();
  });

  // Make sure we are receiving context.
  asyncTest("context", 2, function(){

    var onMessage = function(e){
      var data = JSON.parse(e.data);

      ok(data.context === playerjs.CONTEXT);
      ok(data.version === playerjs.VERSION);
      removeEvent(window, 'message', onMessage);
      start();
    };

    playerjs.addEvent(window, 'message', onMessage);

    // This will force the receiver to echo.
    player.on('ready', function(){});
  });

  // Test to make sure we can attach multiple listeners to the same event.
  asyncTest("multi-listeners", 4, function() {

    var indexes = [];
    var done = function(index){
      indexes.push(index);
      if (indexes.length === 3){
        // Wait for pause.
        player.on('pause', function(){
          player.off('pause');
          player.off('play', one);
          player.play();
        });
        player.pause();
      } else if (indexes.length === 5){
        // Give it some time to call the 6th play event, otherwise
        // suceed.
        setTimeout(function(){
          var occr = {}, n;
          // count occurances in array;
          for (var i = 0; i<indexes.length; i++){
            n = indexes[i];
            if (occr.hasOwnProperty(n)){
              occr[n]++;
            } else {
              occr[n] = 1;
            }
          }
          // Make sure the correct number of play events were done.
          ok(occr[1] === 1, 'The proper number of events were registered');
          ok(occr[0] === 2, 'The proper number of events were registered');
          ok(occr[2] === 2, 'The proper number of events were registered');

          ok(true, 'All play events were registered and executed');
          player.off('play');
          player.pause();
          start();
        }, 200);
      } else if (indexes.length === 6){
        // If we get too many events, we should fail.
        fail('play event was not removed');
      }
    };

    // Callbacks.
    var zero = function(){
      done(0);
    };

    var one = function(){
      done(1);
    };

    var two = function(){
      done(2);
    };

    player.on('play', zero);
    player.on('play', one);
    player.on('play', two);


    player.play();
  });

  if (player.supports('method', playerjs.METHODS.GETPAUSED)){
    asyncTest("getPaused", 1, function() {
      player.on('pause', function(){
        this.off('pause');
        // Test if paused works.
        this.getPaused(function(value){
          ok( true === value, "video is paused" );
          start();
        });
      });

      player.on('play', function(){
        player.off('play');
        player.pause();
      });

      player.play();
    });
  }

  if (player.supports('method', playerjs.METHODS.GETDURATION)){
    asyncTest("Duration", 1, function() {
      player.getDuration(function(value){
        ok(isNumber(value), "video has duration" );
        start();
      });
    });
  }

  if (player.supports('method', playerjs.METHODS.GETCURRENTTIME)){
    asyncTest("getCurrentTime", 1, function() {
      player.getCurrentTime(function(value){
        ok(isNumber(value), "video has time:" + value );
        start();
      });
    });
  }

  if (player.supports('method', [playerjs.METHODS.GETCURRENTTIME, playerjs.METHODS.SETCURRENTTIME])){
    //Test Seek.
    asyncTest("setCurrentTime", 1, function() {
      player.on('timeupdate', function(v){
        if (v.seconds >= 5){
          player.off('timeupdate');
          player.getCurrentTime(function(value){
            ok(Math.floor(value) === 5, "video has time:" + value );
            player.pause();
            start();
          });
        }
      });

      player.play();
      player.setCurrentTime(5);
    });
  }

  if (player.supports('method', [playerjs.METHODS.SETLOOP, playerjs.METHODS.GETLOOP])){
    //Test Loop
    asyncTest("setLoop", 1, function() {
      player.setLoop(true);
      setTimeout(function(){
        player.getLoop(function(v){
          ok(v === true, 'Set Loop was not set');
          start();
        });
      }, 100);
    });
  }

  if (player.supports('method', playerjs.METHODS.GETVOLUME)){
    asyncTest("getVolume", 1, function() {
      player.getVolume(function(value){
        ok(isNumber(value), "video has Volume" );
        start();
      });
    });
  }

  if (player.supports('method', [playerjs.METHODS.SETVOLUME, playerjs.METHODS.GETVOLUME])){
    // Volumne tests
    asyncTest("volume", 1, function() {

      player.setVolume(87);
      player.getVolume(function(value){
        ok(value === 87, "video volume:" + value );
        start();
      });
    });
  }

  if (player.supports('method', [playerjs.METHODS.MUTE, playerjs.METHODS.UNMUTE, playerjs.METHODS.GETMUTED])){
    asyncTest("volume", 2, function() {
      //Mute
      player.mute();

      setTimeout(function(){
        player.getMuted(function(value){
          ok(value, "video muted:" + value );

          //Unmute
          player.unmute();
          setTimeout(function(){
            player.getMuted(function(value){
              ok(!value, "video unmuted:" + value );
              start();
            });
          }, 500);
        });
      }, 500);
    });
  }
}

var count = 0,
  players = [];

var loadPlayers = function() {
  count++;
  if (count === FRAMES.length){
    var iframes = document.getElementsByTagName('iframe');

    for (var d=0; d<iframes.length; d++){
      var player = new playerjs.Player(iframes[d]);

      player.on('ready', testCases, player);
    }
  }
};

for (var f in FRAMES){
  var iframe = document.createElement('iframe');

  iframe.src = FRAMES[f];
  iframe.id = 'iframe_'+f;
  iframe.width = 200;
  iframe.height = 200;

  document.body.appendChild(iframe);

  // we want to load the players a couple of different ways.
  if ( f % 2 === 1){
    loadPlayers();
  } else {
    iframe.onload = loadPlayers;
  }
}