/*global jQuery:true, playerjs:true */

(function($, document, window){

  //Wraps the player with jQuery and a playerjs player to create controls.
  var $Player = function(players){
    this.init(players);
  };

  $Player.prototype.init = function(players){
    this.index = 0;

    // We always process as there are multiple players.
    this.players = $.isArray(players) ? players : [players];

    // Events.
    this.events = {
      'active': [],
      'mute': [],
      'unmute': []
    };

    // All the elements.
    var $controls = $('.controls'),
      $play =  $('.controls .play'),
      $volume =  $('.controls .volume'),
      $bars = $volume.find('span'),
      $loop =  $('.controls .loop'),
      $mute =  $('.controls .mute'),
      $progress = $('.controls .progress'),
      $meter = $('.controls .meter'),
      $next = $('.controls .next'),
      $previous = $('.controls .previous');

    // Reset. just in case.
    $progress.off('click');
    $play.off('click');
    $loop.off('click');
    $mute.off('click');
    $bars.off('mouseenter').off('click');
    $volume.off('mouseleave');

    // Set up the volume bars
    $bars.on('mouseenter', function(){
      var $this = $(this);
      var index = $bars.index($this);

      $bars.each(function(i){
        var $this = $(this);
        if (i <= index){
          $this.removeClass('inactive').addClass('active');
        } else {
          $this.removeClass('active').addClass('inactive');
        }
      });
    });

    $volume.on('mouseleave', function(){
      $bars.removeClass('active').removeClass('inactive');
    });

    // Loop through all the providers and set up events.
    $.each(this.players, $.proxy(function(i, player){

      // Update meter
      player.on('timeupdate', function(data){
        $meter.width((data.seconds/data.duration)*100 + '%');
      });

      // Play events
      player.on('play', function(){
        this.emit('active', i);
        $play.removeClass('paused');
      }, this);

      player.on('pause', function(){
        $play.addClass('paused');
      });

      player.on('ended', function(){
        this.next();
      }, this);

    }, this));

    // Index dependant actions.
    // Seek.
    $progress.on('click', $.proxy(function(e){
      var percent = e.offsetX / $progress.width();

      this.player().getDuration(function(duration){
        this.player().setCurrentTime(percent*duration);
      }, this);
    }, this));

    $play.on('click', $.proxy(function(){
      if ($play.hasClass('paused')){
        this.player().play();
      } else {
        this.player().pause();
      }
    }, this));

    $loop.on('click', $.proxy(function(){
      if ($loop.hasClass('looped')){
        this.player().setLoop(false);
        $loop.removeClass('looped');
      } else {
        this.player().setLoop(true);
        $loop.addClass('looped');
      }
    }, this));

    $mute.on('click', $.proxy(function(){
      if ($mute.hasClass('muted')){
        this.unmute();
      } else {
        this.mute();
      }
    }, this));

    // Set Volume
    $bars.on('click', $.proxy(function(e){
      var $this = $(e.target);
      var index = $bars.index($this);
      var volume = ((index+1) / $bars.length) * 100;

      $.each(this.players, function(i, player){
        player.setVolume(volume);
      });

      $bars.each(function(i){
        var $this = $(this);
        if (i <= index){
          $this.addClass('set');
        } else {
          $this.removeClass('set');
        }
      });

    }, this));

    // Next/Prev
    $next.on('click', $.proxy(function(){
      this.next();
      return false;
    }, this));

    $previous.on('click', $.proxy(function(){
      this.previous();
      return false;
    }, this));

    $bars.addClass('active');
    $previous.addClass('disable');

    this.$mute = $mute;
    this.$next = $next;
    this.$previous = $previous;
  };

  // Get the current player.
  $Player.prototype.player = function(){
    return this.players[this.index];
  };

  // Go to the next player
  $Player.prototype.next = function(){
    if (this.index === this.players.length-1){
      return false;
    }

    this.players[this.index].setCurrentTime(0);
    this.players[this.index].pause();
    this.index++;
    this.emit('active', this.index);
    this.players[this.index].play();

    this.$previous.removeClass('disable');

    if (this.index === this.players.length-1){
      this.$next.addClass('disable');
    }
  };

  // Go to the previous player
  $Player.prototype.previous = function(){
    if (this.index === 0){
      return false;
    }
    this.players[this.index].setCurrentTime(0);
    this.players[this.index].pause();
    this.index--;
    this.emit('active', this.index);
    this.players[this.index].play();

    this.$next.removeClass('disable');
    if (this.index === 0){
      this.$prev.addClass('disable');
    }

    return true;
  };

  // Play.
  $Player.prototype.play = function(index){

    if (index !== 0 && !index){
      this.players[this.index].play();
      return true;
    }

    if (index >= 0 && index <= this.players.length){
      this.players[this.index].setCurrentTime(0);
      this.players[this.index].pause();
      this.index = index;
      this.players[this.index].play();
    }
  };

  $Player.prototype.mute = function(index){
    this.player().mute();
    this.emit('mute');
    this.$mute.addClass('muted');
  };

  $Player.prototype.unmute = function(index){
    this.emit('unmute');
    this.player().unmute();
    this.$mute.removeClass('muted');
  };

  // Send an event to a listener.
  $Player.prototype.emit = function(event, value){
    if (this.events.hasOwnProperty(event)){
      $.each(this.events[event], $.proxy(function(i, func){
        func.call(this, value);
      }, this));
    }
  };

  // Attach a listener.
  $Player.prototype.on = function(event, cb){
    this.events[event].push(cb);
  };

  window.$Player = $Player;

})(jQuery, document, window);

