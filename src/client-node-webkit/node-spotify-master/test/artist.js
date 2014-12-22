var baseTest = require('./basetest.js');
var assert = require('assert');
var spotify = baseTest.spotify;

baseTest.executeTest(test);

function test() {
  console.log('Starting tests');
  var artist = spotify.createFromLink('spotify:artist:2exkZbmNqMKnT8LRWuxWgy');
  artist.browse(spotify.ARTISTBROWSE_FULL, browseComplete);
}

function browseComplete(err, artist) {
  console.log('Browse executed');
  assert(artist.tracks.length != 0);
  assert(artist.tophitTracks.length != 0);
  assert(artist.albums.length != 0);
  assert(artist.similarArtists.length != 0);
  console.log('Number of tracks:' + artist.tracks.length);
  console.log('Number of tophit tracks:' + artist.tophitTracks.length);
  console.log('Number of albums:' + artist.albums.length);
  console.log('Number of similarArtists:' + artist.similarArtists.length);
  console.log(artist.biography);
  spotify.logout(function () {
    process.exit();
  });
}
