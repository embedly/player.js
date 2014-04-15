/*global jQuery:true, playerjs:true */

(function($, document, window){

  // Wrap localStorage.
  var storage = {
    _get: function(){
      var data = JSON.parse(window.localStorage.getItem('resume'));
      return data ? data : {};
    },
    _set: function(data){
      window.localStorage.setItem('resume', JSON.stringify(data));
    },
    get: function(url){
      var data = storage._get();
      return data[url];
    },
    set: function(url, seconds){
      var data = storage._get();
      data[url] = seconds;
      return storage._set(data);
    },
    remove: function(url){
      var data = storage._get();
      delete data[url];
      return storage._set(data);
    },
    clear: function(){
      localStorage.removeItem('resume');
    },
    isValid: function(){
      var uid = new Date(),
          result;
      try {
        window.localStorage.setItem(uid, uid);
        result = window.localStorage.getItem(uid) === uid;
        window.localStorage.removeItem(uid);
        return result;
      } catch(e) {}
      return false;
    }
  };

  // Deal with embedding the video.
  $(document).on('ready', function(){

    if (!storage.isValid){
      window.alert('This demo requires localStorage. Your browser currently does not support the SPEC.');
    }

    // Put videos into an array, can be multiple.
    var data = $('.video').toArray().reduce(function(i, v){
      var $this = $(v);
      i[$this.data('url')] = $this;
      return i;
    }, {});

    // Grap a list of all the URLS.
    var urls = $.map(data, function(v, k){return k;});

    var player;

    // Grab the data.
    $.embedly.oembed(urls, {query: {chars: 150}})
      .progress(function(obj){

        // ignoe.
        if (!obj.html){
          return false;
        }

        // embed the video.
        var ratio = ((obj.height/obj.width)*100).toPrecision(4) + '%';
        var $div = $('<div class="resp"></div>');
        $div.append(obj.html);
        $div.css('padding-bottom', ratio);

        data[obj.original_url].append($div);

        // Create a player.
        player = new playerjs.Player($div.find('iframe').get(0));

        // Revert to an unmute state.
        player.on('ready', function(){
          player.unmute();
        });

        // On timeupdate set the seconds of the currently playing video.
        player.on('timeupdate', function(data){
          if (data.seconds){
            storage.set(obj.original_url, data.seconds);
          }
        });

        // If the video ended, we don't want to ask them to resume.
        player.on('ended', function(data){
          storage.remove(obj.original_url);
        });


        // See if we should resume based on the URL.
        var currentTime = storage.get(obj.original_url);

        // RESUME!
        if (currentTime){
          // Foundation modal stuff.
          $('#resumeModal').foundation('reveal', 'open');
          $('#resumeModal .thumb').html('<img src="'+obj.thumbnail_url+'"></img>');
          $('#resumeModal .media h3').text(obj.title);
          $('#resumeModal .media p').text(obj.description);

          // Resume the video.
          $('.resume-video').on('click', function(){
            $('#resumeModal').foundation('reveal', 'close');

            // This is the best way to setCurrentTime as different providers act
            // differently to setCurrentTime
            player.on('play', function(){
              player.off('play');
              player.setCurrentTime(currentTime);
            });
            player.play();
          });

          // Clear the resume.
          $('.no-resume-video').on('click', function(){
            $('#resumeModal').foundation('reveal', 'close');
            storage.remove(obj.original_url);
          });
        }

        // This is for the demo, not useful if you are trying to implement on your site.
        $('.resume-test').on('click', function(){
          var move = function(){
            //Move
            player.setCurrentTime(270);

            // this is a bug in player.js
            player.off('timeupdate');

            player.on('timeupdate', function(data){
              storage.set(obj.original_url, data.seconds);
              if (data.seconds > 272){
                window.location = window.location.toString();
              }
            });
          };

          // If we are playing, then we just move, otherwise we have to start.
          player.getPaused(function(paused){
            if (paused){
              player.on('play', function(){
                player.off('play');
                move();
              });
              player.play();
            } else {
              move();
            }
          });

          return false;
        });

      });
  });

})(jQuery, document, window);
