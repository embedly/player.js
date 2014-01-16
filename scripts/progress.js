/*global jQuery:true, playerjs:true */

(function($, document){

  var URLS = [
    'https://vimeo.com/46071455',
    'http://www.youtube.com/watch?v=JQKELDNnzUQ',
    'http://www.youtube.com/watch?v=BmFEoCFDi-w'
  ];

  var DATA = [];

  var player = null,
    duration = 0,
    index = 0;

  var display = function(obj, autoplay){
    var ratio = ((obj.height/obj.width)*100).toPrecision(4) + '%';
    var $div = $('<div class="flex-video"><span id="caption"></span></div>');
    $('#result').empty();
    $div.append(obj.html);
    $div.css('padding-bottom', ratio);
    $('#result').append($div);

    player = new playerjs.Player($('iframe')[0]);
    player.on('ready', function(){
      window.player = player;
      player.getDuration(function(d){
        duration = d;
      });

      if (autoplay){
        player.play();
      }

    });

    player.on('timeupdate', function(data){
      $('.meter').css('width', ((data.seconds/data.duration) * 100) + '%');
    });

    player.on('play', function(){
      if ($('#play i').hasClass('fa-play')){
        $('#play i').addClass('fa-pause').removeClass('fa-play');
      }
    });

    player.on('pause', function(){
      if ($('#play i').hasClass('fa-pause')){
        $('#play i').addClass('fa-play').removeClass('fa-pause');
      }
    });

  };

  var play = function(){
    player.play();
    if ($('#play i').hasClass('fa-play')){
      $('#play i').addClass('fa-pause').removeClass('fa-play');
    }
  };

  var pause = function(){
    player.pause();
    if ($('#play i').hasClass('fa-pause')){
      $('#play i').addClass('fa-play').removeClass('fa-pause');
    }
  };

  var prev = function(){
    if (index === 0){
      return false;
    }
    index += -1;
    display(DATA[index], true);
  };

  var next = function(){
    if (index === DATA.length-1){
      return false;
    }
    index += 1;
    display(DATA[index], true);
  };


  $(document).on('ready', function(){

    $.embedly.oembed(URLS)
      .done(function(objs){
        DATA = objs;
        display(DATA[0]);
      });

    var $progress = $('.progress');

    $progress.on('click', function(e){
      var percent = ((e.pageX-$progress.offset().left)/$progress.width());
      var seek = percent*duration;
      $('.meter').css('width', percent*100 + '%');
      player.setCurrentTime(seek);
    });

    $progress.on('mouseenter', function(){
      $(this).animate({
        height:20
      });
    }).on('mouseleave', function(){
      $(this).animate({
        height:5
      });
    });

    $('#play').on('click', function(){
      if ($(this).find('i').hasClass('fa-play')){
        play();
      } else {
        pause();
      }

    });
    $('#prev').on('click', prev);
    $('#next').on('click', next);
  });

})(jQuery, document);
