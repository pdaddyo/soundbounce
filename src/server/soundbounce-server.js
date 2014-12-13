"use strict";

var WebSocketServer = require('ws').Server
    , http = require('http')
    , config = require('./config')
    , session = require('express-session')
    , express = require('express')
    , fileSessionStore = require('./session-store')(session)
    , fs = require('fs')
    , _ = require('underscore')
    , colors = require('colors')
    , crypto = require('crypto')
    , moment = require('moment')
    , spotifyApi = require('spotify-web-api-node')
    , soundbounceShared = require('./public/js/shared.js')
    , shortId = require('shortid');

var jsonFolder = "json/";
var historyFolder = jsonFolder + "history/";


var soundbounceServer = {
    users: [],
    rooms: [],
    userStoreFileName: jsonFolder + "users.json",
    roomStoreFileName: jsonFolder + "rooms.json",

    spotify: new spotifyApi({
        clientId: config.spotify.webAPI.clientID,
        clientSecret: config.spotify.webAPI.clientSecret
        //redirectUri : 'http://www.example.com/callback'
    }),

    sockets: [],

    hash: function (inputString) {
        return crypto.createHash('sha256').update(inputString).digest('hex');
    },

    loadFromDisk: function () {
        this.users = JSON.parse(fs.readFileSync(this.userStoreFileName, {encoding: 'utf8'}));
        this.rooms = JSON.parse(fs.readFileSync(this.roomStoreFileName, {encoding: 'utf8'}));

        // clear listeners

        this.rooms.forEach(function (r){ r.listeners = [];});

        console.log("loaded data from disk.");
    },

    init: function (app, httpServer, sessionHandler) {
        var server = this;

        // load the stores into memory
        this.loadFromDisk();

        // login
        // called from our spotify desktop client (called after libspotify successfully auths the spotify username)
        //
        app.get('/spotify-login/:username', function (req, res) {

            var username = req.params.username;

            if (_.isEmpty(username)) {
                res.send("no username");
            }

            // check the secret passed in from desktop app is correct
            var loginSecret = server.hash(username.toLowerCase() + config.spotify.loginPepper);

            if (req.query.secret != loginSecret) {
                console.log(("Incorrect secret sent by username " + username).red);

                    res.send("internal auth fail");
                    return;
            }
            // if we get here then the secret was good - we can trust the desktop app to have really logged into spotify

            // find user

            var user = _.find(server.users, function (user) {
                return user.spotifyUsername == req.params.username.toLowerCase();

            });

            //create a user if required
            if (user == null) {
                user = {
                    id: shortId.generate(),
                    spotifyUsername: username.toLowerCase(),
                    social: "none",
                    joinedDate: new Date()
                };

                server.users.push(user);
            }

            // keep user  in session
            req.session.user = user;

            if (user.social == "none") {
                res.redirect("/social.html");
            }
            else {
                res.redirect("/app.html");
            }
        });

        // simple room list for the home screen
        app.get('/roomlist', function (req, res) {
            server.rooms.forEach(function (r){
               soundbounceShared.updatePlaylist(r);
            });

            var simpleRoomList = _.map(server.rooms, function (room) {
                return {
                    id: room.id,
                    name: room.name,
                    listeners: room.listeners.length,
                    nowPlaying: room.tracks.length > 0 ? room.tracks[0] : null,
                    color: room.color,
                    description: room.description
                }
            });

            if (req.session.user != null)
                res.send(JSON.stringify(simpleRoomList));
            else
                res.send(JSON.stringify([{id: 0, name: 'ERROR: NOT AUTHORISED', listeners: 0}]));
        });

        // create / edit room
        app.get('/editroom', function (req, res) {

            var roomName = req.query.name;

            if (_.isEmpty(roomName))
                return;

            if(req.query.id=="null")
            {
                var room = {
                    id: shortId.generate(),
                    name: roomName,
                    color: req.query.color,
                    description: req.query.description,
                    locked: false,
                    currentTrackStartedAt: null,
                    currentTrackPosition: 0,
                    tracks: [],
                    admins: [req.session.user.id],
                    listeners: [],
                    bans: [],
                    chat: [],
                    topUpURI: req.query.uri
                };

                var existingRoom = _.find(server.rooms, function (r) {
                    return r.name == roomName;
                });

                if(existingRoom)
                {
                    // room with this name already exists, divert to existing room
                    res.send(JSON.stringify({id: existingRoom.id}));
                    return;
                }

                server.rooms.push(room);
                server.topUpRooms();
                res.send(JSON.stringify({id: room.id}));
            }
            else
            {
                // save changes

                // find room
                var room = _.find(server.rooms, function (room) {
                    return room.id == req.query.id;
                });

                if(!_.contains(room.admins, req.session.user.id))
                {
                    console.warn("attempted edit on room "+room.name.yellow+" by non-admin "+req.session.user.name);
                    res.send(JSON.stringify({authorised:false}));

                    return;
                }

                room.name = roomName;
                room.description = req.query.description;
                room.color = req.query.color;
                room.topUpURI = req.query.uri;

                server.topUpRooms();
                res.send(JSON.stringify({id: room.id}));

                // this room just updated, so re-sync the connected users:
                server.broadcast(room, [{type: 'sync', payload: server.getClientViewOfRoom(room)}]);
            }

        });

        // delete room
        app.get('/deleteroom', function (req, res) {

            var room = _.find(server.rooms, function (r) {
                return r.id == req.query.id;
            });

            if(!room)
                return;

            var roomIndex = server.rooms.indexOf(room);

            if(!_.contains(room.admins, req.session.user.id))
            {
                console.log("attempted delete room "+room.name.yellow+" by non-admin "+req.session.user.name);
                res.send(JSON.stringify({authorised:false}));
                return;
            }

            // remove this user from the room before we send the broadcast
            room.listeners = _.filter(room.listeners, function (listener) {
                return listener.id != req.session.user.id;
            });

            // broadcast to the room that it's gone
            server.broadcast(room, [{type: 'error', payload: 'Room has been deleted'}]);

            // remove the room
            server.rooms.splice(roomIndex, 1);
            console.log(""+room.name.red+" deleted by "+req.session.user.name);

            res.send(JSON.stringify({success:true}));
        });

        // internal status of server
        app.get('/status', function (req, res) {
            // update the playlists
            soundbounceServer.rooms.forEach(function (room) {
                soundbounceShared.updatePlaylist(room);
            });

            // send back easy to view json
            res.send('<html><head></head><body><pre style="font-size:11px;color:#333;">'
            + JSON.stringify({
                rooms: soundbounceServer.rooms.map(function (r){ return {
                   // id: r.id,
                    name:r.name,
                    listeners: r.listeners.map(function (l){return l.name;}),
                    nowPlaying: r.tracks.length > 0 ? r.tracks[0].name : null
                }})
                //,users: soundbounceServer.users
            }, null, "&nbsp;").replace(/\n/g, "<br/>") + "</pre>");
        });

        // web sockets handle all communication with the <Room />
        var wss = new WebSocketServer({server: httpServer});
        wss.on('connection', function (socket) {
            var req = socket.upgradeReq;
            var res = {writeHead: {}}; // fake response

            var user = null;

            var url = req.url;  //e.g. "/fgd-fgGFdfg"
            var roomId = req.url.substr(1);

            var room = _.find(server.rooms, function (room) {
                return room.id == roomId;
            });

            if (room == null) {
                console.log('websocket opened with invalid roomId'.red);
                socket.send(JSON.stringify({error: "no such room"}));
                socket.close();
                return;
            }

            // grab the user from the session when the websocket opens
            sessionHandler(req, res, function (err) {
                // should have a session now
                if (!req.session.user) {
                    console.log('websocket opened without valid session'.red);
                    socket.send(JSON.stringify({error: "no user session"}));
                    socket.close();
                    return;
                }

                // grab user from session
                user = req.session.user;

                if (server.sockets[user.id]) {
                    console.warn(user.name + " tried to open multiple websockets");
                    return;
                }
                /* we're now connected */
                server.sockets[user.id] = socket;

                console.log(("--> " + user.spotifyUsername + " connected to room ").cyan + room.name.green);

                // remove this listener from the room if they're already here (e.g. after a connection issue)
                room.listeners = _.filter(room.listeners, function (listener) {
                    return listener.id != user.id;
                });

                // notify existing listeners that we have a join
                server.broadcast(room,[{type:"join", payload:server.simpleUser(user) }]);

                // now add the new listener
                room.listeners.push(user);

                soundbounceShared.updatePlaylist(room);

                // send initial sync of room state and user info
                socket.send(JSON.stringify([{type: 'sync', payload: server.getClientViewOfRoom(room), user: user}]));

                // setup pinger to keep firewalls open
                var pingTimerId = setInterval(function () {
                    socket.send('[{"type":"ping"}]');
                }, 5000);

                socket.on('close', function () {
                    console.log(("<-- user " + user.spotifyUsername + " left room " + room.name).magenta);
                    server.sockets[user.id] = null;

                    //stop pinging
                    clearInterval(pingTimerId);
                    // remove this listener from the room
                    room.listeners = _.filter(room.listeners, function (listener) {
                        return listener.id != user.id;
                    });

                    // broadcast to remaining listeners that they've gone
                    server.broadcast(room,[{type:"leave", payload:user.id }]);
                });

                socket.on("message", function (data) {
                    // parse message from client
                    var msg = JSON.parse(data);
                    if (_.isEmpty(msg) || _.isEmpty(msg.type))
                        return;

                    switch (msg.type) {
                        case "add-or-vote":
                            server.processAdds(room, user, msg.payload);
                            break;
                        case "chat":
                            server.processChat(room, user, msg.payload);
                            break;
                    }
                })
            });
        });

        console.log('Startup OK'.green);

        // top up rooms and save every 10 mins
        setInterval(function (){
            server.topUpRooms();
            server.saveData();
        }, 1000*60*10);

        server.topUpRooms();

    },

    getRandomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    topUpRooms: function () {

        // automatically top up rooms using linked playlists
        var TOP_UP_WHEN_TRACKS_BELOW = 50;
        var TOP_UP_TRACKS_TO_ADD = 50;

        var server = this;

        server.spotify.clientCredentialsGrant()
            .then(function (data) {
                //console.log('Spotify Web API: access token expires in ' + data['expires_in']);

                // Save the access token so that it's used in future calls
                server.spotify.setAccessToken(data['access_token']);

                server.rooms.forEach(function (room) {
                    soundbounceShared.updatePlaylist(room);

                    if (!_.isEmpty(room.topUpURI)) {

                        // see if we need to top up
                        if (room.tracks.length < TOP_UP_WHEN_TRACKS_BELOW) {
                            // we need to top up! go get the playlist

                            // spotify:user:1118412559:playlist:41Uf61JyNjhkETfVqI3Jjm
                            var uriSplit = room.topUpURI.split(':');
                            var userId = uriSplit[2];
                            var playlistId = uriSplit[4];

                            if(room.topUpURI.indexOf("https://")==0)
                            {

                                // this is an http, not spotify playlist URI, so split differently
                                var httpSplit =  room.topUpURI.split('/');
                                userId = httpSplit[4];
                                playlistId =  httpSplit[6];
                                console.log("[top-up] ".green,userId,playlistId);

                            }
                            server.spotify.getPlaylistTracks(userId, playlistId)
                                .then(function (data) {
                                    var offset = 0;
                                    if (data.total > 100) {
                                        offset = server.getRandomInt(0, data.total - 100);
                                    }
                                    server.spotify.getPlaylist(uriSplit[2], uriSplit[4], {
                                        offset: offset,
                                        limit: 100
                                    }).then(function (data) {

                                        console.log("[top-up] ".green, room.name.yellow, " from ", data.name, data.tracks.items.length);

                                        var simpleUser = {id: "1", name: "SoundBounce", img: '/img/soundbounce.png'};

                                        var tracksToAdd = _.first(_.shuffle(data.tracks.items), TOP_UP_TRACKS_TO_ADD);

                                        var trackIds = [];
                                        _.each(tracksToAdd, function (spotifyTrackAdd) {
                                            var spotifyTrack = spotifyTrackAdd.track;
                                            var simpleTrack = server.simpleTrack(spotifyTrack);
                                            if (_.find(room.tracks, function (t) {
                                                    return t.id == simpleTrack.id;
                                                }) != null) {
                                                // track is already in room, so skip
                                                return;
                                            }
                                            // is it already in add list?
                                            if (!_.contains(trackIds, simpleTrack.id)) {
                                                trackIds.push(simpleTrack.id);
                                            }
                                        });

                                        if(!_.isEmpty(trackIds))
                                            server.processAdds(room, simpleUser, trackIds);

                                    });
                                }, function (err) {
                                    console.log('Topup Playlist ',room.topUpURI,"for",room.name<" not found.", err);
                                });
                        }
                    }
                });
            }, function (err) {
                console.log('Something went wrong when retrieving an access token', err);
            });
    },

    processChat: function (room, user, payload) {

        var nowPlaying = null;

        // make sure we have correct now playing track
        soundbounceShared.updatePlaylist(room);

        if (room.tracks.length > 0) {
            nowPlaying = room.tracks[0];
        }

        var chatmsg = {
            type: "chat",
            id:shortId(),
            message: payload.message,
            timestamp: (new Date()),
            user: this.simpleUser(user),
            context: nowPlaying

        };

        console.log(user.name + ": " + payload.message);

        soundbounceShared.addChatToRoom(room, chatmsg);
        //room.chat.push(chatmsg);

        soundbounceServer.broadcast(room, [{type: "chat", payload: chatmsg}]);
    },

    processAdds: function (room, user, trackIds) {
        // spotify API limited to 50 tracks.
        trackIds = _.first(trackIds, 50);

        // remove querystrings e.g. ?action=browse
        trackIds = trackIds.map(function(t){ return t.split("?")[0];});

        //console.log(user.name + " added/voted " + trackIds.length + " tracks in " + room.name, trackIds);

        var voteList = [], ROOM_MAX_TRACKS = 1000;

        this.spotify.getTracks(trackIds)
            .then(function (data) {
                var tracks = data.tracks;
                if (_.isEmpty(tracks))
                    return;

                var messages = [], simpleTracks = [];

                var canAdd = room.tracks.length< ROOM_MAX_TRACKS;

                try {
                    // todo: log all adds + votes to disk
                    var simpleUser;
                    tracks.forEach(function (spotifyTrack) {
                        if (_.isEmpty(spotifyTrack))
                            return;

                        var simpleTrack = soundbounceServer.simpleTrack(spotifyTrack);

                        if (_.find(room.tracks, function (t) {
                                return t.id == simpleTrack.id;
                            }) != null) {
                            // this track is already in this room
                            voteList.push(simpleTrack.id);
                            return;
                        }

                      /*  console.log("Added " + simpleTrack.name + " by " + simpleTrack.artists.map(function (a) {
                            return a.name;
                        }).join(', '), " length: " + simpleTrack.length);*/

                        simpleUser = soundbounceServer.simpleUser(user);
                        simpleTrack.addedBy = simpleUser;

                        if (String(user.id) != "1") {
                            // vote for the track, but don't trigger a vote event
                            var vote = simpleUser;
                            vote.timestamp = new Date();
                            simpleTrack.votes.push(vote);
                        }

                        // which track are we inserting after
                        simpleTrack.insertAfter = soundbounceServer.getTrackIdToInsertAfter(room, simpleTrack.votes.length);

                        simpleTracks.push(simpleTrack);

                        if(canAdd) {
                            // add it to the room on the server
                            soundbounceShared.addTrackToRoom(room, simpleTrack, simpleUser);
                        }
                    });

                    if(canAdd) {
                        messages.push({type: "add", payload: {tracks: simpleTracks, user: simpleUser}});
                        soundbounceServer.broadcast(room, messages);
                    }

                    if (!_.isEmpty(voteList)) {
                        soundbounceServer.processVotes(room, user, voteList);
                    }

                } catch (err) {
                    console.error(err);
                }
            }, function (err) {
                console.error('Spotify API error:' + err + " ");
            });

    },

    simpleTrack: function (spotifyTrack) {
        return {
            id: spotifyTrack.id,
            name: spotifyTrack.name,
            img: spotifyTrack.album.images[1].url, // image 1 is 300x300 ish
            artists: spotifyTrack.artists.map(function (artist) {
                return {id: artist.id, name: artist.name};
            }),
            length: spotifyTrack.duration_ms,
            addedBy: {},
            votes: []
        }
    },

    simpleUser: function (user) {
        return {id: user.id, name: user.name, img: user.img};
    },

    processVotes: function (room, user, trackIds) {
        var votes = [];
        trackIds.map(function (tid) {
            return _.find(room.tracks, function (t) {
                return t.id == tid;
            });
        }).forEach(function (track) {
            if (track) {
                console.log(user.name + " voted for " + track.name);

                // add the vote to the server, and note which track we're going to put it after
                var insertAfter = soundbounceServer.addVoteToTrack(room, track, soundbounceServer.simpleUser(user));
                if (!insertAfter) {
                    return;
                }

                // now tell the room we have a vote, and where to move it to
                votes.push({trackId: track.id, moveToAfter: insertAfter, user: soundbounceServer.simpleUser(user)});
            }
        });

        soundbounceServer.broadcast(room, [{type: "vote", payload: {votes: votes}}]);
    },

    // given a number of votes, returns the trackId that should be positioned above this one after the move (i.e. the track we should "insert after")
    // returns null if none above (usually first track added)
    // moved from shared.js since client can't decide the order, only server can
    getTrackIdToInsertAfter: function (room, numVotes) {
        if (room.tracks.length == 0) {
            return null;
        }

        var tracksWithSameOrMoreVotes = _.filter(room.tracks, function (t) {
            return t.votes.length >= numVotes;
        });

        if (tracksWithSameOrMoreVotes.length == 0) {
            // none above or equal, so insert after currently playing track.
            return room.tracks[0].id;
        }

        // find the last track with similar or same # votes
        var track = _.last(tracksWithSameOrMoreVotes);

        if (track == null) {
            return null;
        }

        return track.id;
    },

    addVoteToTrack: function (room, track, user) {
              soundbounceShared.updatePlaylist(room);

        var insertAfter = this.getTrackIdToInsertAfter(room, track.votes.length + 1);

        var currentIndex = _.indexOf(room.tracks, track);

        if (currentIndex == 0) {
            // can't vote on the playing track
            console.warn("addVoteToTrack - can't vote for playing track, aborting.");
            return;
        }

        if(_.contains(track.votes.map(function(v){return v.id;}), user.id))
        {
            // can't vote for same track twice
            console.warn("addVoteToTrack - can't vote for a track more than once, aborting.");
            return;
        }

        var insertIndex = 0;

        if (insertAfter) {
            for (var i = 0; i < room.tracks.length; i++) {
                if (room.tracks[i].id == insertAfter) {
                    insertIndex = i + 1;
                }
            }
            console.log("vote - move to after " + insertAfter + ", indices: ", currentIndex, insertIndex);
            if (currentIndex != insertIndex) {
                // move the track
                room.tracks = room.tracks.move(currentIndex, insertIndex);
            }
        }
        else {
            // can't move to top spot since it's playing
            console.warn("addVoteToTrack - tried to insert over playing track??");
        }

        var vote = _.clone(user);
        vote.timestamp = new Date();

        track.votes.push(vote);

        soundbounceShared.addVoteChat(room, track, user);

        return insertAfter;
    },

    getClientViewOfRoom: function (room) {
        // todo: sanitise the output to client
        return room;
    },

    broadcast: function (room, messages) {
        room.listeners.forEach(function (listener) {
            // has the socket been dropped?
            if (!soundbounceServer.sockets[listener.id]) {
                // remove user from room
                room.listeners = _.filter(room.listeners, function (l) {
                    return listener.id != l.id;
                });
                return;
            }

            soundbounceServer.sockets[listener.id].send(JSON.stringify(messages));
        });
    },

    shutdown: function () {
        this.saveData();
        console.log("Shutdown OK ".bgGreen.white);
    },

    saveData: function () {
        // save files to disk
        // save backups first to history folders

        var usersJson = JSON.stringify(this.users, null, "\t");
        var roomsJson = JSON.stringify(this.rooms, null, "\t");

        console.log("saving JSON...");
        fs.writeFileSync(this.getNewHistoryFileName("users"), usersJson);
        fs.writeFileSync(this.getNewHistoryFileName("rooms"), roomsJson);

        fs.writeFileSync(this.userStoreFileName, usersJson);
        fs.writeFileSync(this.roomStoreFileName, roomsJson);


    },

    // searches the history folder for next free name
    getNewHistoryFileName: function (name) {
        var files = fs.readdirSync(historyFolder)
            , number = 0;

        function zeroPad(num, places) {
            var zero = places - num.toString().length + 1;
            return Array(+(zero > 0 && zero)).join("0") + num;
        }

        while (_.any(files, function (filename) {
            return filename == name + "-" + zeroPad(number, 6) + ".json";
        })) {
            number++;
        }
        return String(historyFolder + name + "-" + zeroPad(number, 6) + ".json");
    }
};

module.exports = soundbounceServer;
