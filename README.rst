Player.js
=========

A JavaScript library for interacting with iframes that support Player.js spec.

::

  var player = new playerjs.Player('iframe');

  player.on('ready', function(){
    player.on('play', function(){
      console.log('play');
    });

    player.getDuration(function(duration){
      console.log(duration);
    });

    if (player.supports('method', 'mute')){
      player.mute();
    }

    player.play();
  });


Install
-------
Player.js is hosted on Embedly's CDN.
::

  <script type="text/javascript" src="//cdn.embed.ly/player-0.0.11.min.js"></script>


Ready
-----
Because of the dance that we need to do between both iframes, you should
always wait till the ``ready`` events to fire before interacting with the
player object. However, the player will internally queue messages until
ready is called.
::

  var player = new playerjs.Player('iframe');

  player.on(playerjs.Events.PLAY, function(){
    console.log('play');
  });

  player.on('ready', function(){
    player.setCurrentTime(20);
  });


Timing
------
The timing between when the iframe is added and when the ready event is fired
is important. Sadly we cannot fire the ready event till the iframe is loaded,
but there is no concrete way of telling when postmessage is available to us.

The best way is to do one of the following.

Create the iframe via JavaScript
""""""""""""""""""""""""""""""""
::

  var iframe = document.createElement('iframe');
  iframe.src = 'https://example.com/iframe';
  document.body.appendChild(iframe);

  var player = new playerjs.Player(iframe);

In this case, Player.js will listen to the onload event of the iframe and only
try to communicate when ready.

Wait for the document to be ready.
""""""""""""""""""""""""""""""""""
::

  <iframe src="//example.com/iframe"></iframe>

  <script>
    $(document).on('ready', function(){
      $('iframes').each(function(){
        var player = new playerjs.Player(this);
        player.on('ready', function(){
          player.play();
        });
      });
    });
  </script>

At this point we can reasonably assume that the iframe's been loaded and the
ready. Player.js will take care of listening for ready events that were fired
before the player is set up.


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

``supports``: ['method', 'event'], methodOrEventName
  Determines if the player supports a given event or method.

    player.supports('method', 'getDuration');
    player.supports('event', 'ended');


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


Receiver
--------
If you are looking to implement the Player.js spec, we include a Receiver that
will allow you to easily listen to events and takes care of the house keeping.

::

  var receiver = new playerjs.Receiver();

  receiver.on('play', function(){
    video.play();
    receiver.emit('play');
  });

  receiver.on('pause', function(){
    video.pause();
    receiver.emit('pause');
  });

  receiver.on('getDuration', function(callback){
    callback(video.duration);
  });

  video.addEventListener('timeupdate', function(){
    receiver.emit('timeupdate', {
      seconds: video.currentTime,
      duration: video.duration
    });
  });

  receiver.ready();


Methods
-------

``on``
  Requests an event from the video. The above player methods should be
  implemented. If the event expects a return value a callback will be passed
  into the function call::

    receiver.on('getDuration', function(callback){
      callback(video.duration);
    });

  Otherwise you can safely ignore any inputs::

    receiver.on('play', function(callback){
      video.play();
    });

``emit``
  Sends events to the parent as long as someone is listing. The above player
  events should be implemented. If a value is expected, it should be passed in
  as the second argument::

    receiver.emit('timeupdate', {seconds:20, duration:40});

``ready``
  Once everything is in place and you are ready to start responding to events,
  call this method. It performs some house keeping, along with emitting
  ``ready``::

    receiver.ready();

Adapters
--------
In order to make it super easy to add Player.js to any embed, we have written
adapters for common video libraries. We currently have adapters for
`Video.js <http://www.videojs.com/>`_,
`SublimeVideo <http://sublimevideo.net/>`_ and
`HTML5 Video <http://dev.w3.org/html5/spec-author-view/video.html>`_. An
Adapter wraps the Receiver and wires up all the events so your iframe is
Player.js compatible.


VideoJSAdapter
""""""""""""""
An adapter for `Video.js <http://www.videojs.com/>`_.
::

  videojs("video", {}, function(){
    var adapter = new playerjs.VideoJSAdapter(this);
    // ... Do other things to initialize your video.

    // Start accepting events
    adapter.ready();
  });


HTML5Adapter
""""""""""""
An adapter for
`HTML5 Video <http://dev.w3.org/html5/spec-author-view/video.html>`_.
::

    var video = document.getElementById('video');
    video.load();

    var adapter = playerjs.HTML5Adapter(video);

    // Start accepting events
    adapter.ready();


SublimeAdapter
""""""""""""""
An adapter for `SublimeVideo <http://sublimevideo.net/>`_. Currently the
SublimeVideo player api does not allow developers to change volume, mute or get
paused information.
::

    sublime.ready(function(){
      var player = sublime.player('video');

      var adapter = playerjs.SublimeAdapter(player);

      // Start accepting events
      adapter.ready();
    });


JWPlayerAdapter
""""""""""""""
An adapter for `JW Player <http://www.jwplayer.com>`_.
::

    jwplayer("video").setup({
      file: "/lib/videos/demo.mp4",
      height: '100%',
      width: '100%'
    });

    var adapter = new playerjs.JWPlayerAdapter(jwplayer());

    jwplayer().onReady(function(){
      adapter.ready();
    });
