/*global jQuery:true, playerjs:true, $Player:true */

(function($, document){

  // Simple object to keep track of everything.
  var players = {};

  players.index = 0;
  players.muted = true;

  players.URLS = [
    ['http://cdn.embedly.com/widgets/media.html?',
    'src=https%3A%2F%2Fv.cdn.vine.co%2Fr%2Fvideos%2FA3DCECA0921065427544356032512_230ec5c7e80.0.0.17386839224707932956.mp4',
    '%3FversionId%3DIJm75POQ3hH0fBVT5l4gkeE7r36xjGHv&src_secure=1&url=https%3A%2F%2Fvine.co%2Fv%2FM5M1qB3w0dH&',
    'image=https%3A%2F%2Fv.cdn.vine.co%2Fr%2Fthumbs%2F633C8054511065427545329180672_2609062600d.0.0.17386839224707932956.mp4.jpg',
    '%3FversionId%3DMm4r1ctZ4f3lMWvT5gW2ErRUaTroz.Ao&key=3ee528c9eb4b4908b268ce1ace120c92&type=video%2Fmp4&schema=vine'].join(''),

    ['http://cdn.embedly.com/widgets/media.html?src=http%3A%2F%2Fplayer.vimeo.com%2Fvideo%2F91654611&src_secure=1&',
    'url=http%3A%2F%2Fvimeo.com%2F91654611&image=http%3A%2F%2Fi.vimeocdn.com%2Fportrait%2F1833285_75x75.jpg&',
    'key=3ee528c9eb4b4908b268ce1ace120c92&type=text%2Fhtml&schema=vimeo'].join(''),

    ['http://cdn.embedly.com/widgets/media.html?src=http%3A%2F%2Fdistilleryvesper0-4.ak.instagram.com%2F900772f6bf6411e3a4410002c9d60b10_101.mp4',
    '&src_secure=1&url=http%3A%2F%2Finstagram.com%2Fp%2Fmiz_e7Jv7D%2F&',
    'image=http%3A%2F%2Fdistilleryimage0.ak.instagram.com%2F900772f6bf6411e3a4410002c9d60b10_8.jpg&',
    'key=internal&type=video%2Fmp4&schema=instagram'].join(''),

    ['http://cdn.embedly.com/widgets/media.html?src=http%3A%2F%2Fwww.youtube.com%2Fembed%2FrNJ6U8uHpF8%3Ffeature%3Doembed&',
    'url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DrNJ6U8uHpF8&image=http%3A%2F%2Fi1.ytimg.com%2Fvi%2FrNJ6U8uHpF8%2Fhqdefault.jpg',
    '&key=3ee528c9eb4b4908b268ce1ace120c92&type=text%2Fhtml&schema=youtube'].join(''),

    ['http://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fvidd.me%2Fe%2FORH&url=https%3A%2F%2Fvidd.me%2Fv%2FORH&',
    'image=https%3A%2F%2Fd1wst0behutosd.cloudfront.net%2Fthumbnails%2F16264.png%3Fv1r1397162192&',
    'key=3ee528c9eb4b4908b268ce1ace120c92&type=text%2Fhtml&schema=vidd'].join(''),

    ['http://cdn.embedly.com/widgets/media.html?src=http%3A%2F%2Fwww.youtube.com%2Fembed%2FMi59xObR5N8%3Ffeature%3Doembed&',
    'url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DMi59xObR5N8&image=http%3A%2F%2Fi1.ytimg.com%2Fvi%2FMi59xObR5N8%2Fhqdefault.jpg',
    '&key=3ee528c9eb4b4908b268ce1ace120c92&type=text%2Fhtml&schema=youtube'].join('')
  ];

  // Set up the next player.
  players.next = function(){

    var $demo = $('#demo');
    $demo.remove();

    $demo = $('<iframe src="'+players.URLS[players.index]+'" frameborder="0"></iframe>');

    $('.index .resp').html($demo);

    var player = new playerjs.Player($demo[0]);

    player.on('ready', function(){
      player.setLoop(false);

      player.play();

      player.on('ended', function(){
        players.next();
      });

      var $player = new $Player(player);

      if (players.muted){
        $player.mute();
      } else {
        $player.unmute();
      }

      $player.on('unmute', function(){
        players.muted = false;
      });

      $player.on('mute', function(){
        players.muted = true;
      });

    });
    players.index ++;

    if (players.index >= players.URLS.length){
      players.index = 0;
    }
  };

  players.next();


  // Show hide the title.
  $(window).on('scroll', function(){
    if ($(window).scrollTop() > 60 && !$('body').hasClass('scrolling')){
      $('body').addClass('scrolling');
    } else if ($(window).scrollTop() < 60 && $('body').hasClass('scrolling') ) {
      $('body').removeClass('scrolling');
    }
  });


  //Go to
  $('.goto-demos').on('click', function(){
    $('html, body').animate({
        scrollTop: $("a#demos").offset().top
     }, 200);
    return false;
  });


})(jQuery, document, window);
