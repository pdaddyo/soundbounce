var baseTest = require('./basetest.js');
var assert = require('assert');
var spotify = baseTest.spotify;

baseTest.executeTest(test);

function test() {
  console.log('Starting tests');
  var album = spotify.createFromLink('spotify:album:0rCeg5c3ccoXbWTFCaE7xH');
  album.browse(browseComplete);
}

function browseComplete(err, album) {
  console.log('Browse executed');
  assert(album.tracks.length != 0);
  assert(album.artist !== undefined);
  console.log('Number of tracks:' + album.tracks.length);
  console.log(album.artist);
  console.log('Review: ' + album.review);
  console.log(album.copyrights);
  spotify.logout(function () {
    process.exit();
  });
}
