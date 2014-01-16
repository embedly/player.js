/*global jQuery:true, playerjs:true */

(function($, document){

  var players = [];

  $(document).on('ready', function(){
    $('iframe').each(function(i, e){

      var player = new playerjs.Player(e);

      player.on('ready', function(){

      });

      player.on('play', $.proxy(function(){
        $('#play').text(parseInt($('#play').text(), 10)+1);

        var src = this.elem.src;
        $.each(players, function(i, p){
          if (p.elem.src !== src){
            p.pause();
          }
        });
      }, player));

      player.on('pause', function(){
        $('#pause').text(parseInt($('#pause').text(), 10)+1);
      });

      player.on('finish', function(){
        $('#finish').text(parseInt($('#finish').text(), 10)+1);
      });

      player.on('timeupdate', function(data){
        $('#duration').text(data.seconds);
      });

      players.push(player);
    });
  });


})(jQuery, document);
