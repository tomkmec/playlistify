$(function() {
  var context = this;

  this.clientId = '12eaf8ebd98c4528bc53118dd56d4a1c';
  this.redirectURI = 'http://localhost/pl'// 'http://tom-kmec.net/playlistify/callback.html'

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
        url = url.replace('{scope}', 'playlist-modify-public user-read-private');
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
            .append($('<td colspan="4">')
              .addClass('mdl-data-table__cell--non-numeric')
              .attr('colspan', 4)
              .html('Searching for '+ t + '...')));
      }
    });

    if ($('tbody tr').length > 0) {
      $('#step2').fadeOut();
      $('#step3').fadeIn();
      $('tbody tr').each(function() {
        var $track = $(this);
        $.ajax({
          url: 'https://api.spotify.com/v1/search',
          type: 'GET',
          data: {
            'type': 'track', 
            'q': $track.data('raw')
            //,'market': 'from_token'
          },
          headers: {
              'Authorization': 'Bearer ' + context.accessToken
          },
          dataType: 'json',
          success: context.onSearchResult($track)
        });
      })
    }
  }

  this.onSearchResult = function onSearchResult($track) {
    return function(data) {
      if (data && data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        var track = data.tracks.items[0];
        var tdClass = "mdl-data-table__cell--non-numeric";
        $track.empty()
          .append($('<td>').addClass(tdClass).html(track.artists[0].name))
          .append($('<td>').addClass(tdClass).html(track.name))
          .append($('<td>').addClass(tdClass).html(track.album.name))
          .append($('<td>'));
                    //  <button id="alts1" class="mdl-button mdl-js-button mdl-button--icon" style="top:-6px;">
                    //   <i class="material-icons">more_vert</i>
                    // </button>
                    // <span class="mdl-badge" data-badge="1" style="left: -20px"></span>
                    // <ul class="mdl-menu mdl-menu--bottom-right mdl-js-menu mdl-js-ripple-effect" for="alts1">
                    //   <li class="mdl-menu__item">Some Action: Some ActionSome Action</li>
                    //   <li class="mdl-menu__item">Another Action</li>
                    //   <li disabled class="mdl-menu__item">Disabled Action</li>
                    //   <li class="mdl-menu__item">Yet Another Action</li>
                    // </ul>
        $track.removeClass('pending').addClass('found');
      } else {
        $track.addClass('na').removeClass('pending').find("td").html('could not find "' + $track.data('raw') + '"');
      }
      if ($('p.pending').length == 0) context.onAllSearchDone();
    }
  }

  this.onAllSearchDone = function onAllSearchDone() {

  }

  this.init();
})

function go() {
  // var tracks = $('#input').val().split('\n');

  // $.each(tracks, function(i, t) {
  //   t = t.trim();
  //   if (t != '') {
  //     $('#step2').append($('<p>').html(t + '...').data('raw', t).addClass('pending'));
  //   }
  // });

  // if ($('#step2 p').length > 0) {
  //   $('#step1').hide();
  //   $('#step2').show();
  // }

  // var url = 'https://accounts.spotify.com/authorize?client_id={clientId}&response_type=token&redirect_uri={redirectURI}&scope={scope}';
  // url = url.replace('{clientId}', '12eaf8ebd98c4528bc53118dd56d4a1c');
  // url = url.replace('{redirectURI}', encodeURI('https://' + chrome.runtime.id + '.chromiumapp.org/index.html'));
  // url = url.replace('{scope}', 'playlist-modify-public');
  // $.featherlight({iframe: url, iframeMaxWidth: '80%', iframeWidth: 500, iframeHeight: 300});  

  //chrome.identity.launchWebAuthFlow({ url : url, interactive: true}, onAuthComplete)
}

/*
function onAuthComplete(responseURL) {

  var startMarker = '#access_token=';
  var token = responseURL.substring(responseURL.indexOf(startMarker) + startMarker.length)
  window.token = token.substring(0, token.indexOf('&'));

  $('#step2 p').each(function() {
    var $track = $(this);
    $.getJSON(
      'https://api.spotify.com/v1/search', 
      {'type': 'track', 'q': $track.data('raw'), 'market': 'CZ'}, 
      onSearchResult($track));
  })
}  

function onSearchResult($track) {
  return function(data) {
    if (data && data.tracks && data.tracks.items && data.tracks.items.length > 0) {
      var track = data.tracks.items[0];
      $track.empty()
        .append($('<a>').attr({'href': track.href}).html(track.artists[0].name + ': ' + track.name))
        .data('spotify-uri', track.uri);
      $track.removeClass('pending').addClass('found');
    } else {
      $track.addClass('na').removeClass('pending');
    }
    if ($('p.pending').length == 0) onAllSearchDone();
  }
}

function onAllSearchDone() {
  console.log('all search done, about to fetch identity');

  $.ajax({
      url: 'https://api.spotify.com/v1/me',
      type: 'GET',
      headers: {
          'Authorization': 'Bearer ' + window.token
      },
      dataType: 'json',
      success: onIdentityFetched
  });
}

function onIdentityFetched(iddata) {
  console.log('identity fetched', iddata);

  var url = 'https://api.spotify.com/v1/users/{user_id}/playlists';
  url = url.replace('{user_id}', iddata.id);
  window.userId = iddata.id;
  var data = {
    name: $('#playlistName').val()
  };

  console.log('about to create a playlist', url, data);

  $.ajax({
      url: url,
      type: 'POST',
      data: JSON.stringify(data),
      headers: {
          'Authorization': 'Bearer ' + window.token
      },
      dataType: 'json',
      success: onPlaylistCreated
  });
}

function onPlaylistCreated(playlistData) {
  console.log('playlist created', playlistData);

  var uris = $('#step2 p.found').map(function(i, p) { return $(p).data('spotify-uri') }).toArray();

  var url = 'https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks'
  url = url.replace('{user_id}', window.userId);
  url = url.replace('{playlist_id}', playlistData.id);

  console.log('about to add songs', url, uris);

  $.ajax({
      url: url,
      type: 'POST',
      data: JSON.stringify({'uris' : uris}),
      headers: {
          'Authorization': 'Bearer ' + window.token
      },
      dataType: 'json',
      success: done
  });
}

function done(data) {
  //window.close();
  console.log('done', data);
}
*/