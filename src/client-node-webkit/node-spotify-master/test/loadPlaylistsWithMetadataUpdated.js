var spotify = require('../build/Debug/spotify')({appkeyFile: '../spotify_appkey.key'});
var loginData = require('./loginData.js');
var assert = require('assert');

//This test only shows what it should with a deleted cache/settings folder
var ready = function() {
  console.log('Starting tests');
  function printPlaylist(playlist) {
    console.log(playlist.name + ' is now loaded.');
  }
  var playlists = spotify.playlistContainer.getPlaylists();
  spotify.waitForLoaded(playlists, printPlaylist);
  
  setTimeout( function() {
    spotify.logout(function() {
      process.exit();
    });
  }, 5000);
};

spotify.on({
  ready: ready
});

spotify.login(loginData.user, loginData.password, false, false);