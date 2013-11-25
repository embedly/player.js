/*globals asyncTest:true, ok:true, start:true, Player:true*/
var FRAMES = [
  'src=http%3A%2F%2Fdistilleryvesper8-8.ak.instagram.com%2Fdc7cdbb2418811e3a4fc22000a1fc7c7_101.mp4&src_secure=1&url=http%3A%2F%2Finstagram.com%2Fp%2FgGZegnh9Sg%2F&image=http%3A%2F%2Fdistilleryimage8.ak.instagram.com%2Fdc7cdbb2418811e3a4fc22000a1fc7c7_8.jpg&type=video%2Fmp4&schema=instagram',

 'src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FKYZIj0Nmdps&src_secure=1&url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DKYZIj0Nmdps&image=http%3A%2F%2Fi1.ytimg.com%2Fvi%2FKYZIj0Nmdps%2Fhqdefault.jpg&key=internal&type=text%2Fhtml&schema=youtube',
  'src=https%3A%2F%2Fplayer.vimeo.com%2Fvideo%2F18150336&src_secure=1&url=http%3A%2F%2Fvimeo.com%2F18150336&image=http%3A%2F%2Fb.vimeocdn.com%2Fts%2F117%2F311%2F117311910_1280.jpg&type=text%2Fhtml&schema=vimeo',
    'src=https%3A%2F%2Fw.soundcloud.com%2Fplayer%2F%3Furl%3Dhttp%253A%252F%252Fapi.soundcloud.com%252Ftracks%252F120478577%26auto_play%3Dfalse%26show_artwork%3Dtrue%26origin%3Dtwitter&src_secure=1&url=http%3A%2F%2Fsoundcloud.com%2Fkettelmusic%2Fhon&image=http%3A%2F%2Fi1.sndcdn.com%2Fartworks-000062945914-gt5axz-t500x500.jpg%3F3eddc42&type=text%2Fhtml&schema=soundcloud'
];


var isNumber= function(obj){
  return Object.prototype.toString.call(obj) === "[object Number]";
};

function testCases(player){
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
      player.off('play');
      done();
    });

    player.on('timeupdate', function(data){
      ok(isNumber(data.seconds));
      ok(isNumber(data.duration));

      player.off('timeupdate');
      done();
    });

    player.play();
  });

  asyncTest("Pause", 2, function() {
    player.on('pause', function(){
      ok(true, "video has paused");
      player.off('pause');
      // Test if paused works.
      player.getPaused(function(value){
        ok( true === value, "video is paused" );
        start();
      });
    });

    // We won't fire pause unless we are actually playing first.
    player.on('play', function(){
      player.off('play');
      player.pause();
    });

    player.play();
  });

  asyncTest("Duration", 1, function() {
    player.getDuration(function(value){
      ok(isNumber(value), "video has duration" );
      start();
    });
  });

  asyncTest("getVolume", 1, function() {
    player.getVolume(function(value){
      ok(isNumber(value), "video has Volume" );
      start();
    });
  });

  asyncTest("getCurrentTime", 1, function() {
    player.getCurrentTime(function(value){
      ok(isNumber(value), "video has time:" + value );
      start();
    });
  });

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

  // Volumne tests
  asyncTest("volume", 3, function() {

    player.setVolume(87);
    player.getVolume(function(value){
      ok(value === 87, "video volume:" + value );

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

              // Not all providers have mute, so we are going to need to fix this.
              //player.getVolume(function(value){
              //  ok(value === 87, "video volume:" + value );
              //  start();
              //});
            });
          }, 500);
        });
      }, 500);
    });
  });
}

var count = 0,
  players = [];

var loadPlayers = function() {
  count++;
  if (count === FRAMES.length){
    var iframes = document.getElementsByTagName('iframe');
    for (var d=0; d<iframes.length; d++){
      var player = Player(iframes[d]);
      player.on('ready', function(){
        testCases(this);
      }, player);
      players.push(player);
    }
  }
};

for (var f in FRAMES){
  var iframe = document.createElement('iframe');
  iframe.src = 'http://localhost.com:8000/dist/html/media.html?' + FRAMES[f];
  //iframe.src = 'http://cdn.embedly.com/widgets/media.html?' + FRAMES[f];
  iframe.id = 'iframe_'+f;
  iframe.width = 200;
  iframe.height = 200;

  iframe.onload = loadPlayers;

  document.body.appendChild(iframe);
}