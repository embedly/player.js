/*global jQuery:true, playerjs:true */
(function($, document){

  // Keep track of all the players on the page.
  var players = [];

  // Simple read time timer. Obviously taking into account scrolling and
  // visibilitychange would make this alot better.
  var readtime = {
    time : 0,
    interval: null,
    start: function(){
      readtime.interval = setInterval(function(){
        readtime.time += 200;
        $('#read').text((readtime.time/1000).toFixed(2));
      }, 200);
    },
    stop: function(){
      clearInterval(readtime.interval);
    }
  };

  $(document).on('ready', function(){
    // Start the counter.
    readtime.start();

    // Find all the iframes in the page.
    $('iframe').each(function(i, e){

      // Create a player.
      var player = new playerjs.Player(e);

      // As a result of other demos, we want to make sure we set unmute.
      player.on('ready', function(){
        player.unmute();
      });

      // on the play event, stop readtime and increment counters.
      player.on('play', $.proxy(function(){
        $('#play').text(parseInt($('#play').text(), 10)+1);
        $('title').text('\u25b6 '+ $('title').text());
        readtime.stop();
        // We pause every other video on the page.
        var src = this.elem.src;
        $.each(players, function(i, p){
          if (p.elem.src !== src){
            p.pause();
          }
        });
      }, player));

      // Start readtime again and increment counters.
      player.on('pause', function(){
        $('#pause').text(parseInt($('#pause').text(), 10)+1);
        $('title').text($('title').text().substr(2));
        readtime.start();
      });

      // Start readtime again and increment counters.
      player.on('ended', function(){
        $('#finish').text(parseInt($('#finish').text(), 10)+1);
        readtime.start();
      });

      // Increment duration counter on timeupdate.
      player.on('timeupdate', function(data){
        $('#duration').text(data.seconds);
      });

      // Add to the players.
      players.push(player);
    });
  });

})(jQuery, document);
