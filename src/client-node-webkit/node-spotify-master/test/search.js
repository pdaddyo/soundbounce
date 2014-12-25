var baseTest = require('./basetest.js');
var assert = require('assert');
var spotify = baseTest.spotify;

baseTest.executeTest(test);

function test() {
  console.log('Starting tests');
  var search = new spotify.Search('godspeed');
  search.albumLimit = 10;
  search.artistLimit = 10;
  search.trackLimit = 10;
  search.playlistLimit = 10;
  search.execute(searchComplete);
}

function searchComplete(err, search) {
  console.log('Search executed');
  assert(search.tracks.length != 0);
  assert(search.albums.length != 0);
  assert(search.artists.length != 0);
  assert(search.playlists.length != 0);
  assert(search.totalTracks != 0);
  assert(search.totalArtists != 0);
  assert(search.totalAlbums != 0);
  assert(search.totalPlaylists != 0);
  console.log('Total number of tracks:' + search.totalTracks);
  console.log('Total number of artists:' + search.totalArtists);
  console.log('Total number of albums:' + search.totalAlbums);
  console.log('Total number of playlists:' + search.totalPlaylists);
  console.log(search.didYouMean);
  spotify.logout(function () {
    process.exit();
  });
}
