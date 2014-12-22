var _spotify = require('./nodespotify');
var metadataUpdater = require('./metadataUpdater');

function addMethodsToPrototypes(sp) {
  sp.internal.protos.Playlist.prototype.getTracks = function() {
    var out = new Array(this.numTracks);
    for(var i = 0; i < this.numTracks; i++) {
      out[i] = this.getTrack(i);
    }
    return out;
  }
  sp.internal.protos.PlaylistContainer.prototype.getPlaylists = function () {
    var out = new Array(this.numPlaylists);
    for(var i = 0; i < this.numPlaylists; i++) {
      out[i] = this.getPlaylist(i);
    }
    return out;
  }
}

var beefedupSpotify = function(options) {
  var spotify = _spotify(options);
  addMethodsToPrototypes(spotify);
  spotify.version = '0.6.0';

  spotify.on = function(callbacks) {
    if(callbacks.metadataUpdated) {
      var userCallback = callbacks.metadataUpdated;
      callbacks.metadataUpdated = function() {
        userCallback();
        metadataUpdater.metadataUpdated();
      }
    } else {
      callbacks.metadataUpdated = metadataUpdater.metadataUpdated;
    }
    spotify._on(callbacks);
  }

  spotify.waitForLoaded = metadataUpdater.waitForLoaded;
  return spotify;
}

module.exports = beefedupSpotify;
