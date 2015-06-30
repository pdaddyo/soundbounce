
![Soundbounce](http://soundbounce.org/images/soundbounce-white-bg.png)

###Music sounds better together.

A synchronised, collaborative Spotify client.

**Now available as a Chrome Extension!** https://github.com/pdaddyo/soundbounce/wiki/Soundbounce-Chrome-Extension

http://soundbounce.org/


[![Stories in Ready](https://badge.waffle.io/pdaddyo/soundbounce.png?label=ready&title=Ready)](https://waffle.io/pdaddyo/soundbounce)
Features
=======
- Public listening rooms
- High bitrate, normalized audio
- Integrated Spotify search
- Dragging and dropping to add tracks from Spotify
- Chat (with emoji)
- Voting
- Star now playing track
- *NEW* Preview upcoming tracks and search results
- Auto top-up with existing Spotify playlist
- Create / edit your own room

Requirements
==========
- Windows 7+ / OSX 10.7+
- Spotify Premium account
- .NET Framework 4.5 (on Windows)
- OSX 10.7+ (on Mac)

Installation instructions
=============
- Download latest release: https://github.com/pdaddyo/soundbounce/releases
- Run soundbounce-setup-v1.0.exe, then follow the on-screen instructions.

Motivation
==========
After the announcement that Soundrop would be closing its doors, I was unable to find a suitable alternative.  Some alternatives use Youtube, but the sound quality is often poor.  Some also use soundcloud, but not all tracks are available.  Since Spotify are removing all apps in the desktop, the only way to build a "clone" of Soundrop was to build a native client, using their official library libspotify.  

Libspotify is limited to premium accounts only, but for now is the only option (until their web api supports deeper control e.g. track seeking etc).  Since the majority of Soundbounce is a web application, this transition could be made to being 100% browser-only in the future, but for now we need a native client.  

Are you a developer?  Please get involved!

Known issues
============
- Sometimes audio won't work on first launch.  Wait a few minutes, restart app and should be fine from then on.  Seems to affect OSX more than Windows.  
- If you get spotify credentials wrong, you'll have to re-launch app

Technology used
=================
- libspotify & libspotify.net to connect to Spotify
- naudio for sound output
- Chrome Embedded Frame (and CefSharp) for all UI
- WinForms to host the ChromiumWebBrowser
- React / JSX for front-end 
- node.js for the server, keeps all data in memory and stores in simple JSON files
- Express webserver, websockets & passport for social integration
- Spotify Web API used on the server to lookup tracks, and load playlists

Future plans
=========
See the issues list for future enhancements, or add your own ideas here!
https://github.com/pdaddyo/soundbounce/issues
