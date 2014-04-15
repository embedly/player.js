/*global jQuery:true, playerjs:true */

(function($, document, window){

  // An object that keeps track of all the iframes on the page.
  var Scroller = function(iframes){
    this.init(iframes);
  };

  Scroller.prototype.init = function(iframes){
    this.data = [];

    // create a player for each of the iframes.
    iframes.each($.proxy(function(i, elem){
      var $elem = $(elem);

      // create the player.
      var player = new playerjs.Player(elem);

      // when the player is ready, add it to the rotatation
      player.on('ready', function(){
        player.unmute();
        this.add($elem, player);
      }, this);
    }, this));

    // Listen to the scroll events.
    this.listen();
  };

  // Add the elements positioning data.
  Scroller.prototype.add = function($elem, player){
    var t = $elem.offset().top,
      b = t + $elem.height();

    this.data.push({
      top: t,
      bottom: b,
      $elem: $elem,
      player: player
    });
  };

  // Called by the on scroll event.
  Scroller.prototype.scrolled = function(){
    var $window = $(window);

    // Get the scrollTop and scrollBottom.
    var t = $window.scrollTop();
       var b = t + $window.height();

    // It possible to have multiple videos inframe, so we only want to play
    // the first one or the one that has the largest percentage in frame.
    $.each($.map(this.data, function(obj, i){

      // We need to find the percentage of the video that's in frame.
      var p = 0;

      // There is overlap of the window and iframe.
      if (obj.top <= b && obj.bottom >= t) {
        // Height of the embed.
        var h = obj.bottom - obj.top;

        // Based on the window, figure out percentages.
        if (obj.bottom > b){
          p = (b - obj.top) / h;
        } else if (obj.top < t){
          p = (obj.bottom - t) / h;
        } else {
          p = 1;
        }
      }

      // Stripped down object of what we need.
      return {
        p: p,
        t: obj.top,
        player: obj.player
      };
    }).sort(function(a, b){
      // sort based on percentages.
      if (a.p > b.p){
        return -1;
      } else if (a.p < b.p) {
        return 1;
      }

       // If the percentages are equal, use the one higher on the page.
      if (a.t < b.t){
        return -1;
      } else if (a.t > b.t){
        return 1;
      }
      return 0;
    }), function(i, obj){

      // the first obj in the list should be the one we want to play, but
      // make sure it has at least a little inframe.
      if (i === 0 && obj.p > 0.25){
        obj.player.play();
      } else {
        // pause the rest.
        obj.player.pause();
      }
    });
  };

  // Called when the window is resized. It allows use to update the data
  // to with the new top and bottom. It's a bit faster to do this, as window
  // resize isn't called all that often.
  Scroller.prototype.resized = function(){
    $.each(this.data, function(i, obj){
      obj.top = obj.$elem.offset().top;
      obj.bottom = obj.top + obj.$elem.height();
    });

    // We call scrolled here as most likely something went out of frame.
    this.scrolled();
  };

  Scroller.prototype.listen = function($elem, player){
    var $window = $(window);

    // Listen to the scroll event.
    $window.on('scroll', $.proxy(function(){

      // Nothings ready yet.
      if (this.data.length === 0){
        return false;
      }

      this.scrolled();
    }, this));

    // Listen to the resize event.
    $window.on('resize', $.proxy(function(){

      // Nothings ready yet.
      if (this.data.length === 0){
        return false;
      }

      this.resized();
    }, this));
  };


  $(document).on('ready', function(){

    var URLS = [
      'https://vimeo.com/78329678',
      'https://www.youtube.com/watch?v=jofNR_WkoCE',
      'http://instagram.com/p/iUUbPvoXTy/',
      'https://vine.co/v/hZ9YmEWaPwO'
    ];

    // Embed the URLS.
    $.embedly.oembed(URLS)
      .progress(function(obj){

        if (!obj.html){
          return false;
        }

        // Responsive.
        var ratio = ((obj.height/obj.width)*100).toPrecision(4) + '%';
        var $div = $('<div class="resp"></div>');
        $div.append(obj.html);
        $div.css('padding-bottom', ratio);

        // For padding in the demo.
        var $box = $('<div class="scroll-box"></div>');
        $box.append($div);

        $('.content').append($box);
      })
    .done(function(){
      // Set up all the new scrollers.
      var scroller = new Scroller($('iframe'));
    });
  });

})(jQuery, document, window);