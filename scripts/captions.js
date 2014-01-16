/*global jQuery:true, playerjs:true */
(function($, document){

  var player = null,
    captions = {};

  var timeupdate = function(data){
    var seconds = Math.floor(data.seconds);
    //console.log(seconds, captions, captions.hasOwnProperty(seconds));
    if (captions.hasOwnProperty(seconds)){
      $('#caption').text(captions[seconds]).show();
    } else {
      $('#caption').text('').hide();
    }
  };

  var start = function(url){
    $.embedly.oembed(url, {query: {scheme: 'http'}})
      .progress(function(obj){
        var ratio = ((obj.height/obj.width)*100).toPrecision(4) + '%';
        var $div = $('<div class="flex-video"><span id="caption"></span></div>');
        $div.append(obj.html);
        $div.css('padding-bottom', ratio);
        $('#result').append($div);

        player = new playerjs.Player($('iframe')[0]);
        player.on('ready', function(){
          window.player = player;
          addRow();
          player.on('timeupdate', timeupdate);
        });
      });
  };

  var addRow = function(){
    $('#captions form').append([
      '<div class="row">',
        '<div class="large-2 columns">',
          '<label>Time</label>',
          '<input type="text" class="time">',
        '</div>',
        '<div class="large-9 columns">',
          '<label>Caption</label>',
          '<input type="text" class="caption">',
        '</div>',
        '<div class="large-1 columns">',
          '<label>Remove</label>',
          '<a href="#" class="remove"><i class="fa fa-minus"></i></a>',
        '</div>',
      '</div>'
    ].join(''));
  };

  $(document).on('ready', function(){
    var $url = $('#url');

    $url.on('paste', function(){
      start($url.val());
    });
    $('#urlForm').on('submit', function(){
      start($url.val());
      return false;
    });

    $('#add').on('click', function(){
      addRow();
      return false;
    });

    $(document).on('click', '.remove', function(){
      $(this).parents('.row').get(0).remove();
    });

    $(document).on('blur', '#captions form input', function(){
      var $parent = $(this).parents('.row').eq(0);

      var time = $parent.find('.time').val(),
        caption = $parent.find('.caption').val();

      if (time && caption){
        var p = time.split('-');

        if (p.length === 2){
          for (var i = parseInt($.trim(p[0]), 10); i < parseInt($.trim(p[1]), 10)+1; i++){
            captions[i] = caption;
          }
        } else {
          captions[parseInt(time, 10)] = caption;
        }
      }
    });
  });

})(jQuery, document);
