var spotify = require('../build/Debug/spotify')({appkeyFile: '../spotify_appkey.key'});
var loginData = require('./loginData.js');

/*
 * The user probably wants to logout before quitting, so we set a timeout.
 */
function quit() {
  setTimeout(function() {
    console.log('Exiting');
    process.exit();
  }, 5000);
}

function executeTest(testerFunction) {
  var ready = function() {
    console.log('Awaiting caches...');
    setTimeout(testerFunction, 3000);
  };
  spotify.on({
    ready: ready
  });
  spotify.login(loginData.user, loginData.password, false, false);
}

module.exports = {
  executeTest: executeTest,
  quit: quit,
  spotify: spotify
};
