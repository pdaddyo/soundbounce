var spotify = require('../build/Debug/spotify')({appkeyFile: '../spotify_appkey.key'});
var loginData = require('./loginData.js');
var assert = require('assert');

spotify.ready(function() {
  console.log('Starting tests');
  function printTrack(track) {
    console.log(track);
  }
  function waitForTrack(playlist) {
    var track = playlist.getTracks(0);
    console.log('Track is loaded: ' + track.isLoaded);
    spotify.waitForLoaded([track], printTrack);
  }
  var playlist = spotify.playlistContainer.getPlaylist(14);
  spotify.waitForLoaded([playlist], waitForTrack);
  
  setTimeout( function() {
    spotify.logout(function() {
      process.exit();
    });
  }, 5000);
});

spotify.login(loginData.user, loginData.password, false, false);