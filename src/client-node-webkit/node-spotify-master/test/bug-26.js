var baseTest = require('./basetest.js');
var spotify = baseTest.spotify;

baseTest.executeTest(test);

function test() {
  console.log('Starting tests');
  var track = spotify.createFromLink('spotify:track:6koWevx9MqN6efQ6qreIbm');
  spotify.player.play(track);
  setTimeout( function() {
    spotify.player.stop();
    spotify.logout(function () {
      process.exit();
    });
  }, 10000);
}
