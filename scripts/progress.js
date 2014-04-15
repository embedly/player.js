/*global jQuery:true, playerjs:true */

(function($, document, window){

  var URLS = [
    'https://vimeo.com/88829079'
  ];

  var DATA = [];

  var player = null,
    duration = 0,
    index = 0;

  //Display the embed.
  var display = function(obj, autoplay){
    var ratio = ((obj.height/obj.width)*100).toPrecision(4) + '%';
    var $div = $('<div class="flex-video"><span id="caption"></span></div>');
    $('#result').empty();
    $div.append(obj.html);
    $div.css('padding-bottom', ratio);
    $('#result').append($div);

    // Set up the player.
    player = new playerjs.Player($('iframe')[0]);
    player.on('ready', function(){
      player.unmute();

      player.getDuration(function(d){
        duration = d;
      });

      if (autoplay){
        player.play();
      }
    });

    var $meter = $('.meter'),
      $duration = $('.duration'),
      $currentTime = $('.current-time');

    // Set up the timeupdate to move the meter.
    player.on('timeupdate', function(data){
      $meter.css('width', ((data.seconds/data.duration) * 100) + '%');
      $duration.text(data.duration.toFixed(1));
      $currentTime.text(data.seconds.toFixed(1));
    });
  };

  $(document).on('ready', function(){

    // Go get the embed code from Embedly.
    $.embedly.oembed(URLS)
      .progress(function(obj){
        display(obj, true);
      });

    // Set up the progress bar are the top of the page.
    var $progress = $('.progress'),
      $duration = $('.duration'),
      $currentTime = $('.current-time');

    // On progress click, seek to a position.
    $progress.on('click', function(e){
      var percent = ((e.pageX-$progress.offset().left)/$progress.width());
      var seek = percent*duration;
      $('.meter').css('width', percent*100 + '%');
      player.setCurrentTime(seek);
    });

    // Set up the expand animation.
    var animateUp = function(){
      $(this).animate({
        height:5,
        duration:10
      }, function(){
        $progress.removeClass('open');
        $progress.one('mouseenter', animateDown);
      });
    };

    var animateDown = function(){
      $(this).animate({
        height:20,
        duration:10
      }, function(){
        $progress.addClass('open');
        $progress.one('mouseleave', animateUp);
      });
    };

    $progress.one('mouseenter', animateDown);
  });

})(jQuery, document, window);
