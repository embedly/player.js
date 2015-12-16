/*global jQuery:true, playerjs:true */

(function($, document, window){

  var URLS = [
    {
      url: 'http://www.youtube.com/watch?v=Ru0FfuACPbc',
      start: 34,
      end: 38
    },
    {
      url: 'http://www.youtube.com/watch?v=u5wmParkppw ',
      start: 12,
      end: 23
    },
    {
      url: 'http://www.youtube.com/watch?v=Oyoc9rRSGl4',
      start: 53,
      end: 58
    },
    {
      url: 'http://www.youtube.com/watch?v=Oyoc9rRSGl4',
      start: 75.5,
      end: 85
    },
    {
      url: 'http://www.youtube.com/watch?v=jhiAHoKm9Mo',
      start: 29,
      end: 35
    },
    {
      url: 'http://www.youtube.com/watch?v=i6e4WpaXV7k',
      start: 14,
      end: 17
    },
    {
      url: 'http://www.youtube.com/watch?v=2bkRGH4sJDE',
      start: 5,
      end: 9
    },
    {
      url: 'http://www.youtube.com/watch?v=Hzh9koy7b1E',
      start: 42,
      end: 45
    },
    {
      url: 'http://www.youtube.com/watch?v=0mfSfekiZeE',
      start: 9,
      end: 10
    }
  ];


  $(document).on('ready', function(){
    var $boards = $('#boards');

    var urls = $.map(URLS, function(d){return d.url; });

    // Go get all the URLS from embedly.
    $.embedly.oembed(urls)
      .done(function(results){
        $.each(results, function(i, obj){

          if (!obj.html){
            return true;
          }

          var d = URLS[i];

          var thumb = $.embedly.display.crop(obj.thumbnail_url, {query: {height:300, width:300}});

          var $board = $(['<li>',
            '<img src="'+thumb+'"></img>',
            '<i class="fa fa-play"></i>',
            '<i class="fa fa-pause"></i>',
            obj.html,
          '</li>'].join(''));

          $board.data(d);
          $boards.append($board);

          var player = new playerjs.Player($board.find('iframe')[0]);
          player.on('ready', function(){
            player.unmute();
          });

          $board.data('player', player);
        });


        $boards.find('li').on('click', function(){
          var $this = $(this),
            start = $this.data('start'),
            end = $this.data('end'),
            player = $this.data('player');

          var done = function(){
            $this.removeClass('playing');
            player.off('pause');
            player.off('ended');
            player.off('timeupdate');
          };

          if ($this.hasClass('playing')){
            player.pause();
          } else {
            player.on('play', function(){
              $this.addClass('playing');
              player.setCurrentTime(start);
              player.off('play');
            });

            player.on('pause', done);
            player.on('ended', done);

            player.on('timeupdate', function(data){
              if (data.seconds >= end){
                player.pause();
                player.off('timeupdate');
              }
            });

            player.play();
          }
        });
      });
  });

})(jQuery, document, window);