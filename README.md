![Soundbounce](http://soundbounce.org/images/soundbounce-white-bg.png)

###Music sounds better together.

A synchronised, collaborative Spotify client, now available for Windows users with Spotify Premium accounts.

http://soundbounce.org/

Features
=======
- Public listening rooms
- High bitrate, normalized audio
- Dragging and dropping to add tracks from Spotify
- Chat
- Voting
- Auto top-up with existing Spotify playlist
- Create / edit your own room

Requirements
==========
- Windows 7+
- Spotify Premium account
- .NET Framework 4.5

Installation instructions
=============
- Download latest release: https://github.com/pdaddyo/soundbounce/releases
- Unzip to a new folder, then run Soundbounce.exe

Motivation
==========
After the announcement that Soundrop would be closing its doors, I was unable to find a suitable alternative.  Some alternatives use Youtube, but the sound quality is often poor.  Some also use soundcloud, but not all tracks are available.  Since Spotify are removing all apps in the desktop, the only way to build a "clone" of Soundrop was to build a native client, using their official library libspotify.  

Libspotify is limited to premium accounts only, but for now is the only option (until their web api supports deeper control e.g. track seeking etc).  Since 80% of Soundbounce is a web application, this transition could be made to being 100% browser-only in the future, but for now we need a native client.  

Are you a developer?  Please get involved!

Known issues
============
- If you get spotify credentials wrong, you'll have to re-launch app
- Your clock must be correct, ish.  Different timezones is fine.  This will be addressed in a future update

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
