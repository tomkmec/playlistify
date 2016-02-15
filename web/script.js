$(function() {
  var context = this;

  this.clientId = '12eaf8ebd98c4528bc53118dd56d4a1c';
  this.redirectURI = 'http://tom-kmec.net/playlistify'

  this.init = function init() {
    var accessTokenMatch = location.hash.match(/access_token=([^&]+)/);
    if (accessTokenMatch) {
      context.accessToken = accessTokenMatch[1];
      $('#step2').show();
      context.getUserInfo();
      $('#search').on('click', context.doSearch);
    } else {
      $('#step1').show();
      $('#start').on('click', function() {
        var url = 'https://accounts.spotify.com/authorize?client_id={clientId}&response_type=token&redirect_uri={redirectURI}&scope={scope}';
        url = url.replace('{clientId}', context.clientId);
        url = url.replace('{redirectURI}', context.redirectURI);
        url = url.replace('{scope}', 'playlist-modify-private playlist-modify-public user-read-private');
        window.location.href = url;
      });
    }
  };

  this.getUserInfo = function getUserInfo() {
    $.ajax({
        url: 'https://api.spotify.com/v1/me',
        type: 'GET',
        headers: {
            'Authorization': 'Bearer ' + context.accessToken
        },
        dataType: 'json',
        success: function(data) { 
          context.userData = data;
          $('h2:visible').html('Hello ' + data.display_name + ', drop your playlist here please');
          if (data.images && data.images.length > 0) {
            $('.mdl-card__menu:visible').append($('<img>').attr({'src':data.images[0].url}).addClass('avatar'));
          }
          console.log(data);
          $('#search').removeAttr('disabled');
          $('.mdl-spinner:visible').hide();
        }
    });
  }

  this.doSearch = function doSearch() {
    var tracks = $('#in').val().split('\n');
    $.each(tracks, function(i, t) {
      t = t.trim();
      if (t != '') {
        $('#step3 tbody')
          .append($('<tr>').addClass('pending').data('raw', t)
            .append(
              $('<td>').append($('<div>').addClass("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active")),
              $('<td>')
                .addClass('mdl-data-table__cell--non-numeric')
                .attr('colspan', 4)
                .html('Searching for '+ t + '...'),
              $('<td>').addClass('mdl-data-table__cell--non-numeric')));
      }
    });

    if ($('tbody tr').length > 0) {
      $('#step2').fadeOut();
      $('#step3').fadeIn();
      componentHandler.upgradeDom();
      $('tbody tr').each(context.doTrackSearch(context.onSearchResult));
    }
  }

  this.doTrackSearch = function doTrackSearch(callback, $trackIn) {
    return function() {
      var $track = $trackIn || $(this);
      $.ajax({
        url: 'https://api.spotify.com/v1/search',
        type: 'GET',
        data: {
          'type': 'track', 
          'q': $track.data('raw'),
          'limit': 10,
          'market': 'from_token'
        },
        headers: {
            'Authorization': 'Bearer ' + context.accessToken
        },
        dataType: 'json',
        success: callback($track)
      })
    }
  }

  this.onSearchResult = function onSearchResult($track) {
    return function(data) {
      if (data && data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        var track = data.tracks.items[0];
        var rowId = 'track' + $track.index();
        var tdClass = "mdl-data-table__cell--non-numeric";

        var $optionsTD = $('<td>').addClass(tdClass);
        if (data.tracks.items.length > 1) {
          var $optionsLI = [];
          $.each(data.tracks.items, function() {
            var altData = this;
            var desc = this.artists[0].name + ': ' + this.name + ' (' + this.album.name + ')';
            $optionsLI.push($('<li>').addClass("mdl-menu__item").html(desc).data('spotify-uri', altData.uri).on('click', function() {
              $track.find('td')
                .first().next().next().html(altData.artists[0].name)
                .next().html(altData.name)
                .next().html(altData.album.name)
              // $(this).siblings().removeAttr('disabled');
              // $(this).attr('disabled', 'disabled');
              $track.data('spotify-uri', altData.uri)
            }));
            // $optionsLI[0].attr('disabled', 'disabled')
          })
          $optionsTD
            .append($('<button>').addClass("mdl-button mdl-js-button mdl-button--icon").css('top', '-6px').attr('id', rowId)
              .append($('<i>').addClass("material-icons").html("more_vert"))
            ).append($('<span>').addClass("mdl-badge").attr('data-badge', data.tracks.items.length-1).css('left','-14px'))
            .append($('<ul>').addClass("mdl-menu mdl-menu--bottom-right mdl-js-menu mdl-js-ripple-effect").attr('for', rowId)
              .append($optionsLI)
            )
        }

        $track.empty()
          .append($('<td>').addClass(tdClass).empty().append($('<i>').addClass("material-icons").html('done')))
          .append($('<td>').addClass(tdClass).html($track.data('raw')))
          .append($('<td>').addClass(tdClass).html(track.artists[0].name))
          .append($('<td>').addClass(tdClass).html(track.name))
          .append($('<td>').addClass(tdClass).html(track.album.name))
          .append($optionsTD)
          .data('spotify-uri', track.uri)
        $track.removeClass('pending').addClass('found');
      } else {
        $track.addClass('na').removeClass('pending').find("td")
          .first().empty().append($('<i>').addClass("material-icons").html('error_outline'))
          .next().empty().append(
            $('<div>').addClass("mdl-textfield mdl-js-textfield").css({padding:0, width: '100%','padding-right': '48px', 'margin-right': '-30px'}).append(
              $('<input>').addClass("mdl-textfield__input").val($track.data('raw'))))
          .next().empty().append(
            $('<button>').addClass("mdl-button mdl-js-button mdl-button--icon").css('top', '-6px').attr('id', rowId)
              .append($('<i>').addClass("material-icons").html("youtube_searched_for"))
              .on('click', function() {
                $track.data('raw', $track.find('input').val());
                var searchFn = context.doTrackSearch(context.onSearchResult, $track);
                searchFn();
              })
            )
      }
      if ($('p.pending').length == 0) context.onAllSearchDone();
    }
  }

  this.onAllSearchDone = function onAllSearchDone() {
      componentHandler.upgradeDom();
      $('#done').removeAttr('disabled').on('click', context.createPlaylist);
  }

  this.createPlaylist = function createPlaylist() {
    var url = 'https://api.spotify.com/v1/users/{user_id}/playlists';
    url = url.replace('{user_id}', context.userData.id);
    var data = {
      name: $('#playlistName').val(),
      'public': $('#playlistPublic').parent('label').is('.is-checked')
    };

    if (!context.done) {
      context.done = true;
      $.ajax({
          url: url,
          type: 'POST',
          data: JSON.stringify(data),
          headers: {
              'Authorization': 'Bearer ' + context.accessToken
          },
          dataType: 'json',
          success: context.populatePlaylist
      });
    }
  }

  this.populatePlaylist = function populatePlaylist(playlistData) {
    var uris = $('tr.found').map(function(i, p) { return $(p).data('spotify-uri') }).toArray();

    var url = 'https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks'
    url = url.replace('{user_id}', context.userData.id);
    url = url.replace('{playlist_id}', playlistData.id);

    $.ajax({
        url: url,
        type: 'POST',
        data: JSON.stringify({'uris' : uris}),
        headers: {
            'Authorization': 'Bearer ' + context.accessToken
        },
        dataType: 'json',
        success: function() {
          window.location.href = playlistData.external_urls.spotify
        }
    });
  }

  this.init();
})