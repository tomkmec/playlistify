$(function() {
  $('#go').on('click', onGo);
})

function onGo() {
  var tracks = $('#input').val().split('\n');

  $.each(tracks, function(i, t) {
    t = t.trim();
    if (t != '') {
      $('#step2').append($('<p>').html(t + '...').data('raw', t));
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
  token = token.substring(0, token.indexOf('&'));

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
      $track.empty().append($('<a>').attr({'href': track.href}).html(track.artists[0].name + ': ' + track.name))
    } else {
      $track.addClass('na')
    }
  }
}