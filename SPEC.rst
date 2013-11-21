Player.js Spec
==============

The goal of this document is to define a common message format for media hosted
within iframes where the parent interacts with the child iframe via
postMessage.

This is based heavily off Vimeo's `JavaScript
API<https://developer.vimeo.com/player/js-api>`_, Soundclouds `Widget API
<http://developers.soundcloud.com/docs/api/html5-widget>`_ and YouTube's
`Player API https://developers.google.com/youtube/iframe_api_reference>`_.


Why
---
We have common API's for getting embed code via `oEmbed <http://oembed.com>`_.
The next iteration of that is actually being able to interact with the media.

The most common use case is for video and audio hosted within iframes. The
parent page would like to play/pause or listen to progress of the media. We
make this available via a common set of json that is passed back between the
parent and the child.


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
    method: 'methodName',
    value: 'methodValue',
    listener: 'listenerName'
  }

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

  {
    event: 'methodName',
    listener: 'listenerName',
    value: 'returnValue'
  }


Events
""""""
The child frame will often fire a number of events, such as ``play``,
``finish`` and ``playProgress``. This defines what is passed back.

No events should be passed back unless the parent explicitly asks for them. To
add a listener we send the following message.

  {
    method: 'addEventListener',
    value: 'event',
    listener: 'listenerName'
  }

When the event is fired, the parent will receive the following event data::

  {
    event: 'event',
    listener: 'listenerName',
    value: {}
  }


Client
------
It's helpful to have a quick example of the JavaScript before moving forward.

// Play the video
document.getElementByID('#iframe').contentWindow.postMessage(
  JSON.stringify({
    method: 'play'
  })
);

// Set up an event listener.

var iframe = document.getElementById('#iframe'),
  origin = iframe.src.split('/', 3).join('/');

var play = function(){
  console.log('play);
};

window.addEventListener('message', function(){
  if (e.origin === origin){
    if (e.event === play){
      played();
    }
  }
});

iframe.contentWindow.postMessage(
  JSON.stringify({
    method: 'addEventListener',
    value: 'event'
  })
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

``isPaused``: boolean
  Determine if the media is paused::

    {
      method: 'isPaused'
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

``isMuted``: boolean
  Determine if the media is muted::

    {
      method: 'isMuted'
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

``seekTo``: number
  Perform a seek to a particular time in seconds::

    {
      method: 'seekTo',
      value: 12
    }

``getCurrentTime``: number
  Get the current time in seconds of the video::

    {
      method: 'getCurrentTime',
    }


``removeEventListener``: void
  Remove an event listener. If the listener is specified it should remove only
  that listener, otherwise remove all listeners::

    {
      method: 'removeEventListener',
      value: 'event',
      listener: 'listenerName'
    }



``addEventListener``: void
  Add an event listener::

    {
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
      event: 'ready',
      data: {
        src: 'srcOfIframe'
      }
    }


``loadProgress``
  fires when the media is loading additional media for playback::

    {
      event: 'playProgress',
      data: {
        seconds: 10,
        duration: 40
      }
    }

``playProgress``
  fires during playback::

    {
      event: 'playProgress',
      data: {
        seconds: 10,
        duration: 40
      }
    }

``play``
  fires when the video starts to play::

    {
      event: 'play',
    }

``pause``
  fires when the video is paused::

    {
      event: 'play',
    }

``finish``
  fires when the video is finished::

    {
      event: 'finish',
    }
