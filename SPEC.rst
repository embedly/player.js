Player.js Spec
==============

The goal of this document is to define a common message format for media hosted
within iframes where the parent interacts with the child iframe via
postMessage.

This is based heavily off the HTML5 Video `Spec
<http://dev.w3.org/html5/spec-author-view/video.html>`_, Vimeo's `JavaScript
API <https://developer.vimeo.com/player/js-api>`_, Soundclouds `Widget API
<http://developers.soundcloud.com/docs/api/html5-widget>`_ and YouTube's
`Player API <https://developers.google.com/youtube/iframe_api_reference>`_.


Why
---
We have common API's for getting embed code via `oEmbed <http://oembed.com>`_.
The next iteration of that is actually being able to interact with the media.

The most common use case is for video and audio hosted within iframes. The
parent page would like to play/pause or listen to progress of the media. We
make this available via a common set of json that is passed back between the
parent and the child.


License
-------
This specification is licensed under the Creative Commons Attribution License.
You can learn more about the license `here
<http://creativecommons.org/licenses/by-nd/4.0/>`_. The more people that refine
this Spec, the better, so we tried to pick the least restrictive license we
could.


Support
-------
Currently the following browsers support postMessage and hence can use this:

* FF3+
* IE8+
* Chrome
* Safari 5+
* Opera10+


Common
------
There are two types of message type, events and methods.

Methods
"""""""
These are ``play``, ``pause`` and ``getDuration`` are all examples of methods.
They have a common format::

  {
    context: 'player.js',
    version: 'version'
    method: 'methodName',
    value: 'methodValue',
    listener: 'listenerName',
  }

``context``
  The context of the postMessage data to avoid conflicts. Will always be
  ``player.js``.

``version``
  The version of the library that you are using. Currently this is ``0.0.11``.

``method``
  The method name that we wish to invoke.

``value``
  If the method sets an attribute, the value attribute should be set.

``listener`` (optional)
  A generic identifier that the child should echo back to the parent on
  returning data. This is not specifically a callback. The problem faced with
  using postMessage is that all message from child iframes are passed over the
  same pipe. If multiple clients are communicating with the child, the parent
  must be able to differentiate which messages are for it.

  Without modifying the src of the iframe, we feel this is the best way to
  differentiate the events.

If the method is a getter, i.e. ``getDuration`` the child frame will send the
following message to the parent.
::

  {
    context: 'player.js',
    version: '0.0.11',
    event: 'methodName',
    listener: 'listenerName',
    value: 'returnValue'
  }


Events
""""""
The child frame will often fire a number of events, such as ``play``,
``finish`` and ``playProgress``. This defines what is passed back.

No events should be passed back unless the parent explicitly asks for them. To
add a listener we send the following message::

  {
    context: 'player.js',
    version: 'version',
    method: 'addEventListener',
    value: 'event',
    listener: 'listenerName'
  }

When the event is fired, the parent will receive the following event data::

  {
    context: 'player.js',
    version: 'version',
    event: 'event',
    listener: 'listenerName',
    value: {}
  }


Client
------
It's helpful to have a quick example of the JavaScript before moving forward.
::

  // Play the video
  document.getElementById('#iframe').contentWindow.postMessage(
    JSON.stringify({
      context: 'player.js',
      version: 'version',
      method: 'play'
    })
  );

  // Set up an event listener.

  var iframe = document.getElementById('#iframe'),
    origin = iframe.src.split('/', 3).join('/');

  var played = function(){
    console.log('played');
  };

  window.addEventListener('message', function(){
    if (e.origin === origin){
      var data = JSON.parse(e.data);
      if (data.context === 'player.js' && data.event === play){
        played();
      }
    }
  });

  iframe.contentWindow.postMessage(
    JSON.stringify({
      context: 'player.js',
      version: 'version',
      method: 'addEventListener',
      value: 'play'
    });
  );


Methods
-------
``play``: void
  Play the media::

    {
      method: 'pause'
    }

``pause``: void
  Pause the media::

    {
      method: 'pause'
    }

``getPaused``: boolean
  Determine if the media is paused::

    {
      method: 'getPaused'
    }

``mute``: void
  Mute the media::

    {
      method: 'mute'
    }

``unmute``: void
  Unmute the media::

    {
      method: 'unmute'
    }

``getMuted``: boolean
  Determine if the media is muted::

    {
      method: 'getMuted'
    }

``setVolume``: void
  Set the volume. Value needs to be between 0-100::

    {
      method: 'setVolume',
      value: 50
    }

``getVolume``: number
  Get the volume. Value will be between 0-100::

    {
      method: 'getVolume',
    }

``getDuration``: number
  Get the duration of the media is seconds::

    {
      method: 'getDuration',
    }

``setCurrentTime``: number
  Perform a seek to a particular time in seconds::

    {
      method: 'setCurrentTime',
      value: 12
    }

``getCurrentTime``: number
  Get the current time in seconds of the video::

    {
      method: 'getCurrentTime',
    }


``setLoop``: boolean
  Tell the media to loop continuously::

    {
      method: 'setLoop',
      value: true
    }

``getLoop``: number
  Return the loop attribute of the video::

    {
      method: 'getLoop',
    }


``removeEventListener``: void
  Remove an event listener. If the listener is specified it should remove only
  that listener, otherwise remove all listeners::

    {
      context: 'player.js',
      version: 'version',
      method: 'removeEventListener',
      value: 'event',
      listener: 'listenerName'
    }



``addEventListener``: void
  Add an event listener::

    {
      context: 'player.js',
      version: 'version',
      method: 'addEventListener',
      value: 'event',
      listener: 'listenerName'
    }


Events
------
Events that can be listened to.

``ready``
  fired when the media is ready to receive commands. This is fired regardless
  of listening to the event.::

    {
      context: 'player.js',
      version: 'version',
      event: 'ready',
      value: {
        src: 'srcOfIframe',
        events: [
          'event1'
        ],
        methods: [
          'method1'
        ]
      }
    }


  ``ready`` sets the stage for the rest of the interactions with the iframe.
  There are a number of attributes in the value that helps us understand the
  compatibility of the embed.

  ``src``
    Echos back the src of the iframe to let the frontend know which frame is
    ready. If there are two iframes with the same source on the page, this will
    not work as expected. We recommend randomizing one aspect of the src to
    assure this does not happy. As an example, you can add a timestamp or a
    uuid::

      <iframe src="....&_=1385393930268"></iframe>

    The ideal solution would be to set a playerID or another unique identifier.
    However this would require building the iframe src, or reloading the iframe
    after it's been rendered.

  ``methods``
    A list of the methods that the iframe media supports.

  ``events``
    A list of events that the iframe media supports.

``progress``
  Fires when the media is loading additional media for playback::

    {
      context: 'player.js',
      version: 'version',
      event: 'progress',
      value: {
        seconds: 10,
        duration: 40
      }
    }

``timeupdate``
  Fires during playback::

    {
      context: 'player.js',
      version: 'version',
      event: 'timeupdate',
      value: {
        seconds: 10,
        duration: 40
      }
    }

``play``
  Fires when the video starts to play::

    {
      context: 'player.js',
      version: 'version',
      event: 'play',
    }

``pause``
  Fires when the video is paused::

    {
      context: 'player.js',
      version: 'version',
      event: 'pause',
    }

``ended``
  Fires when the video has ended::

    {
      context: 'player.js',
      version: 'version',
      event: 'ended',
    }

``error``
  Fires when something goes wrong::

    {
      context: 'player.js',
      version: 'version',
      event: 'error',
      value: {
        code: -1
        msg: ""
      }
    }

  ``code``
    Default error codes are as follows:

    * ``-1`` Undefined.
    * ``1`` Playback not supported by device or browser.
    * ``2`` Method not supported.
