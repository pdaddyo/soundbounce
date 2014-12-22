{
  "targets": [
  {
    "target_name": "nodespotify",
    "sources": [
      "src/node-spotify.cc", "src/audio/audio.c",
      "src/callbacks/PlaylistCallbacksHolder.cc",
      "src/callbacks/SessionCallbacks.cc",
      "src/callbacks/SearchCallbacks.cc", "src/callbacks/AlbumBrowseCallbacks.cc",
      "src/callbacks/ArtistBrowseCallbacks.cc", "src/callbacks/PlaylistContainerCallbacksHolder.cc",

      "src/utils/ImageUtils.cc", "src/utils/V8Utils.cc",

      "src/objects/spotify/Track.cc", "src/objects/spotify/Artist.cc",
      "src/objects/spotify/Playlist.cc", "src/objects/spotify/PlaylistContainer.cc",
      "src/objects/spotify/Album.cc", "src/objects/spotify/Search.cc",
      "src/objects/spotify/Spotify.cc", "src/objects/spotify/Player.cc",
      "src/objects/spotify/PlaylistFolder.cc", "src/objects/spotify/User.cc",
      "src/objects/spotify/TrackExtended.cc",

      "src/objects/node/NodeTrack.cc", "src/objects/node/NodeArtist.cc",
      "src/objects/node/NodePlaylist.cc", "src/objects/node/NodeAlbum.cc",
      "src/objects/node/NodePlayer.cc", "src/objects/node/NodeSearch.cc",
      "src/objects/node/NodeSpotify.cc", "src/objects/node/NodePlaylistFolder.cc",
      "src/objects/node/NodePlaylistContainer.cc", "src/objects/node/NodeUser.cc",
      "src/objects/node/NodeTrackExtended.cc"
    ],
    "link_settings" : {
      "libraries": ["-framework OpenAL -framework libspotify"]
    },
    "copies": [ {
      "destination": "<(PRODUCT_DIR)",
      "files": ["src/spotify.js", "src/metadataUpdater.js"]
      }
    ],
    "conditions": [
      ["OS=='mac'", {
        "xcode_settings": {
          "OTHER_CPLUSPLUSFLAGS" : ["-std=c++11", "-stdlib=libc++"],
          "GCC_ENABLE_CPP_EXCEPTIONS": 'YES',
          "MACOSX_DEPLOYMENT_TARGET" : "10.8"
        },
        "sources": ["src/audio/openal-audio.c"],
        "defines": ["OS_OSX"],
        "link_settings" : { "libraries" : ["-framework", "OpenAL"] }
      }],

      ["OS=='linux'", {
        "sources": ["src/audio/alsa-audio.c"],
        "cflags": ["-I/usr/include/alsa"],
        "cflags_cc": [
          "-std=c++11",
          "-fexceptions"
          ],
        "defines": ["OS_LINUX"],
        "link_settings" : { "libraries" : ["-lasound"] }
      }]
    ]
  }
  ]
}
