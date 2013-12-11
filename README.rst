Player.js
=========

A JavaScript library for interacting with iframes that support Player.js spec.

::

  var player = Player('iframe');

  player.on('ready', function(){
    player.on('play', function(){
      console.log('play');
    });

    player.getDuration(function(duration){
      console.log(duration);
    });

    player.play();
  });


Install
-------
Player.js is hosted on Embedly's CDN.
::

  <script type="text/javascript" src="//cdn.embed.ly/player-0.0.2.min.js"></script>


Ready
-----
Because of the dance that we need to do between both iframes, you should
always wait till the ``ready`` events to fire before interacting with the
player object. However, the player will internally queue messages until
ready is called.
::

  var player = new playerjs.Player('iframe');

  player.on(playerjs.Events.PLAY, function(
    console.log('play');
  ));

  player.on('ready', function(){
    player.setCurrentTime(20);
  });



Methods
-------
``play``: void
  Play the media::

    player.play();

``pause``: void
  Pause the media::

    player.pause();

``getPaused``: boolean
  Determine if the media is paused::

    player.getPaused(function(value){
      console.log('paused:', value);
    });

``mute``: void
  Mute the media::

    player.mute();

``unmute``: void
  Unmute the media::

    player.unmute();

``getMuted``: boolean
  Determine if the media is muted::

    player.getMuted(function(value){
      console.log('muted:', value);
    });

``setVolume``: void
  Set the volume. Value needs to be between 0-100::

    player.setVolume(50);

``getVolume``: number
  Get the volume. Value will be between 0-100::

    player.getVolume(function(value){
      console.log('getVolume:', value);
    });

``getDuration``: number
  Get the duration of the media is seconds::

    player.getDuration(function(value){
      console.log('getDuration:', value);
    });

``setCurrentTime``: number
  Perform a seek to a particular time in seconds::

    player.setCurrentTime(50);

``getCurrentTime``: number
  Get the current time in seconds of the video::

    player.getCurrentTime(function(value){
      console.log('getCurrentTime:', value);
    });

``off``: void
  Remove an event listener. If the listener is specified it should remove only
  that listener, otherwise remove all listeners::

    player.off('play');

    player.off('play', playCallback);

``on``: void
  Add an event listener::

    player.on('play', function(){
      console.log('play');
    }, this);


Events
------
Events that can be listened to.

``ready``
  fired when the media is ready to receive commands. This is fired regardless
  of listening to the event.


``progress``
  fires when the media is loading additional media for playback::

    {
      percent: 0.8,
    }


``timeupdate``
  fires during playback::

    data: {
      seconds: 10,
      duration: 40
    }

``play``
  fires when the video starts to play.

``pause``
  fires when the video is paused.

``ended``
  fires when the video is finished.

``seeked``
  fires when the video is finished.

``error``
  fires when an error occurs.
