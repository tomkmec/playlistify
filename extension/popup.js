$(function() {
  $('#go').on('click', onGo);
})

function onGo() {
  var tracks = $('#input').val().split('\n');

  $.each(tracks, function(i, t) {
    t = t.trim();
    if (t != '') {
      $('#step2').append($('<p>').html(t + '...').data('raw', t).addClass('pending'));
    }
  });

  if ($('#step2 p').length > 0) {
    $('#step1').hide();
    $('#step2').show();
  }

  var url = 'https://accounts.spotify.com/authorize?client_id={clientId}&response_type=token&redirect_uri={redirectURI}&scope={scope}';
  url = url.replace('{clientId}', '12eaf8ebd98c4528bc53118dd56d4a1c');
  url = url.replace('{redirectURI}', encodeURI('https://' + chrome.runtime.id + '.chromiumapp.org/index.html'));
  url = url.replace('{scope}', 'playlist-modify-public');
  chrome.identity.launchWebAuthFlow({ url : url, interactive: true}, onAuthComplete)
}

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