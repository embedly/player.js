/*global jQuery:true, playerjs:true */
(function($, document){

  var player = null,
    captions = {};

  var timeupdate = function(data){
    var seconds = Math.floor(data.seconds);
    if (captions.hasOwnProperty(seconds)){
      $('#caption').text(captions[seconds]).show();
    } else {
      $('#caption').text('').hide();
    }
  };

  var embed = function(url){

    // reset captions.
    captions = {};

    // Grab the data from Embedly's API.
    return $.embedly.oembed(url, {query: {scheme: 'http'}})
      .progress(function(obj){

        // Give up in an ugly way.
        if (!obj.html){
          window.alert('This video could not be embedded');
          return false;
        }

        // Figure out the ratio and build the div.
        var ratio = ((obj.height/obj.width)*100).toPrecision(4) + '%';
        var $div = $('<div class="resp"><span id="caption"></span></div>');
        $div.append(obj.html);
        $div.css('padding-bottom', ratio);
        $('#result').append($div);

        // Find the iframe and create a players.
        player = new playerjs.Player($('iframe')[0]);
        player.on('ready', function(){

          // Add a row for the first caption.
          addRow();

          // Make sure we have volume.
          player.unmute();
          player.on('timeupdate', timeupdate);
        });

        // Show the actions.
        $('.caption-actions').show();
        $('.caption-actions a.play').off('click').on('click', function(){
          player.setCurrentTime(0);
          player.play();
        });
      });
  };

  // Add a blank caption row.
  var addRow = function(t, c){

    // In the beginning we can pass values into the row.
    t = t ? t : '';
    c = c ? c : '';

    $('#captions form').append([
      '<div class="row">',
        '<div class="large-2 columns">',
          '<label>Range</label>',
          '<input type="text" class="time" placeholder="i.e. 0-10" value="'+t+'">',
        '</div>',
        '<div class="large-9 columns">',
          '<label>Caption</label>',
          '<input type="text" class="caption" placeholder="caption text" value="'+c+'">',
        '</div>',
        '<div class="large-1 columns">',
          '<label>Remove</label>',
          '<a href="#" class="remove"><i class="fa fa-minus"></i></a>',
        '</div>',
      '</div>'
    ].join(''));
  };

  $(document).on('ready', function(){

    // A simple way to get all the query args into a dict. Assumes unique params.
    var initial = window.location.search.toString().substr(1).split('&').reduce(
      function(i,v){
        var p = v.split('=');
        if (p.length === 2) {
          i[p[0]]=decodeURIComponent(p[1]);
        }
        return i;
      }, {});

    //If we got a URL, then we need to build out the rows.
    if (initial.url){

      $('#url').val(initial.url);

       // Go embed the URL
      embed(initial.url)
        .done(function(){
          var r = [];
          // When we have the results from the API call, start adding rows.
          $.each(initial, function(k,v){
            if (k.substr(0,1)=== 'c'){
              var i = parseInt(k.substr(1), 10),
                p = v.split('::');

              if (p.length === 2){
                r[i] = {
                  t : p[0],
                  c : p[1]
                };
              }
            }
          });

          // Add everone as a row.
          $.each(r, function(i, d){
            addRow(d.t, d.c);
            $('#captions form input').trigger('blur');
          });

          // Autoplay
          player.on('ready', function(){
            player.play();
          });
        });
    }

    // URL inpute
    var $url = $('#url');

    // Set up all the actions.
    $url.on('paste', function(){
      embed($url.val());
    });

    $('.url-form').on('submit', function(){
      embed($url.val());
      return false;
    });

    $('.url-form a').on('click', function(){
      $('.url-form').trigger('submit');
      return false;
    });

    $('#add').on('click', function(){
      addRow();
      return false;
    });

    // Deal with creating the share modal.
    $('.share').on('click', function(){

      // From the rows create a URL.
      var query = 'url='+encodeURIComponent($('#url').val())+'&'+$('#captions .row').map(
        function(i, row){
          var $row=$(this),
            t = $row.find('.time').val(),
            c = $row.find('.caption').val();

          if (t && c){
            return 'c'+i+'='+encodeURIComponent(t +'::' + c);
          }
          return '';
        }).toArray().join('&');

      var url = 'http://playerjs.io/captions.html?'+query;

      $('.modal-results').val(url);

      // Open the modal.
      $('#share').foundation('reveal', 'open');

      return false;
    });

    // Set up the remove row click.
    $(document).on('click', '.remove', function(){
      $(this).parents('.row').get(0).remove();
      return false;
    });

    // Add the rows to the captions dict.
    $(document).on('blur', '#captions form input', function(){
      var $parent = $(this).parents('.row').eq(0);

      var time = $parent.find('.time').val(),
        caption = $parent.find('.caption').val();

      if (time && caption){
        var p = time.split('-');
        // It's a range.
        if (p.length === 2){
          for (var i = parseInt($.trim(p[0]), 10); i < parseInt($.trim(p[1]), 10)+1; i++){
            captions[i] = caption;
          }
        // Its a single second.
        } else {
          captions[parseInt(time, 10)] = caption;
        }
      }
    });
  });

})(jQuery, document);
