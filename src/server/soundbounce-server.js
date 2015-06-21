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
    , shortId = require('shortid')
    , youtube = require('./soundbounce-youtube');

var jsonFolder = "json/";
var historyFolder = jsonFolder + "history/";


var soundbounceServer = {
    users: [],
    rooms: [],
    userStoreFileName: jsonFolder + "users.json",
    roomStoreFileName: jsonFolder + "rooms.json",
    superAdmins: ['Q11rWo9W'],

    RECYCLE_TRACKS_WHEN_PLAYLIST_HAS_LESS_THAN: 200,
    TOP_UP_WHEN_TRACKS_BELOW: 130,
    ROOM_MAX_TRACKS: 300,
    MAX_RECENT_ROOMS: 10,

    spotify: new spotifyApi({
        clientId: config.spotify.webAPI.clientID,
        clientSecret: config.spotify.webAPI.clientSecret
    }),

    sockets: [],

    hash: function (inputString) {
        return crypto.createHash('sha256').update(inputString).digest('hex');
    },

    loadFromDisk: function () {
        this.users = JSON.parse(fs.readFileSync(this.userStoreFileName, {encoding: 'utf8'}));
        this.rooms = JSON.parse(fs.readFileSync(this.roomStoreFileName, {encoding: 'utf8'}));

        // clear listeners

        var trackCount = 0;
        this.rooms.forEach(function (r) {
            r.listeners = [];
            trackCount += r.tracks.length;
            // filter null tracks
            r.tracks = r.tracks.filter(function (n) {
                return n != undefined
            });
        });


        console.log("loaded data from disk:");
        console.log(this.rooms.length + " rooms containing " + trackCount + " tracks, " + this.users.length, " users");

    },

    init: function (app, httpServer, sessionHandler) {
        var server = this;

        // load the stores into memory
        this.loadFromDisk();

        // load youtube module
        youtube.init(app, this);

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
                console.log(("Incorrect secret sent by username " + username).red + " - expected " + loginSecret);
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

            // check we're logged in
            if (req.session.user == null){
                res.send(JSON.stringify({rooms: [{id: 0, name: 'ERROR: NOT AUTHORISED', listeners: 0}], recent: recentRooms}));
                return;
            }
            server.rooms.forEach(function (r) {
                soundbounceShared.updatePlaylist(r, server);
            });

            var simpleRoomList = _.map(server.rooms, server.getSimpleRoom);

            var orderedRoomList = _(simpleRoomList).chain().sortBy(function (r) {
                return -r.visits;
            }).sortBy(function (r) {
                return -r.listeners;
            }).value();

            var top30 = _.first(orderedRoomList, 30);

            var recentRooms = [];

            var user = server.findUserById(req.session.user.id);
            if(user.recentRooms){
                recentRooms = user.recentRooms.map(function (recentRoom){
                    return server.getSimpleRoom(server.findRoomById(recentRoom.id));
                });
            }

            res.send(JSON.stringify({rooms: req.query["top30"] ? top30 : orderedRoomList, recent: recentRooms }));

        });

        // create / edit room
        app.get('/editroom', function (req, res) {

            var roomName = req.query.name;

            if (_.isEmpty(roomName))
                return;

            if (req.query.id == "null") {
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
                    topUpURI: req.query.uri,
                    visits: 0
                };

                var existingRoom = _.find(server.rooms, function (r) {
                    return r.name.toLowerCase() == roomName.toLowerCase();
                });

                if (existingRoom) {
                    // room with this name already exists, divert to existing room
                    res.send(JSON.stringify({id: existingRoom.id}));
                    return;
                }

                server.rooms.push(room);
                server.topUpRooms();
                res.send(JSON.stringify({id: room.id}));
            }
            else {
                // save changes

                // find room
                var room = server.findRoomById(req.query.id);

                if (!_.contains(room.admins, req.session.user.id)) {
                    console.warn("attempted edit on room " + room.name.yellow + " by non-admin " + req.session.user.name);
                    res.send(JSON.stringify({authorised: false}));

                    return;
                }

                room.name = roomName;
                room.description = req.query.description;
                room.color = req.query.color;
                room.topUpURI = req.query.uri;

                server.topUpRooms();
                res.send(JSON.stringify({id: room.id}));

                // this room just updated, so re-sync the connected users:
                server.reSyncAllUsers(room);
            }

        });

        // delete room
        app.get('/deleteroom', function (req, res) {


            var room = _.find(server.rooms, function (r) {
                return r.id == req.query.id;
            });

            if (!room)
                return;

            if (!_.contains(room.admins, req.session.user.id)) {
                console.log("attempted delete room " + room.name.yellow + " by non-admin " + req.session.user.name);
                res.send(JSON.stringify({authorised: false}));
                return;
            }

            server.deleteRoom(room, req.session.user);

            res.send(JSON.stringify({success: true}));
        });

        // public status of server (not used by soundbounce client but useful for monitoring)
        app.get('/status', function (req, res) {
            var listeners = 0;
            var roomsWithListeners = [];
            // update the playlists
            soundbounceServer.rooms.forEach(function (room) {
                soundbounceShared.updatePlaylist(room, server);
                listeners += room.listeners.length;
                if (room.listeners.length > 0)
                    roomsWithListeners.push(room);
            });

            var result = '<html><head><style>body{font-family: "Helvetic Neue", Helvetica, Arial;}</style></head><body><h2>'
                + listeners + ' listeners in ' + roomsWithListeners.length + ' rooms</h2>'

            _.sortBy(soundbounceServer.rooms, function (r) {
                return -r.listeners.length;
            }).forEach(function (r) {
                result += ('<h2>' + r.name + '</h2>');
                result += r.listeners.map(function (l) {
                        return "<img src='" + l.img + "'/> ";
                    }).join('') + "<br/>";

                if (r.listeners.length > 0) {
                    result += ('<h4>' + (r.listeners.map(function (l) {
                        return l.name;
                    }).join(', ')) + '</h4>');
                }

                result += ("<p>" + _.sortBy(_.last(_.filter(r.chat, function (c) {
                    return c.type == "chat";
                }), 5), function (c) {
                    return -(new Date(c.timestamp).getTime());
                }).map(function (chat) {
                    return ("" + chat.user.name + "<span style='font-size:10px;'> " + moment(chat.timestamp).from(soundbounceShared.serverNow()) + "</span> " + chat.message + "<br/>");

                }).join('') + "</p>" );

                result += "<hr/>";
            });

            res.send(result);
        });

        // send admin message to all people in rooms
        app.get('/adminmessage', function (req, res) {
            if (!_.contains(soundbounceServer.superAdmins, req.session.user.id)) {
                req.send("you're not super admin!");
                return;
            }
            _.keys(soundbounceServer.sockets).forEach(function (key) {
                var socket = soundbounceServer.sockets[key];
                try {
                    socket.send(JSON.stringify([{type: "announce", payload: req.query.message}]));
                }
                catch (er) {
                    console.error("error sending admin message: ", er);
                }
            });

            console.log("sent admin message -->", req.query.message);
            res.send("sent to " + _.keys(soundbounceServer.sockets.length) + " users");
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
                    console.warn(user.name + " tried to open multiple websockets...closing all of them!");

                    try {
                        server.sockets[user.id].close();
                    } catch (err) {
                        console.log("error closing existing socket.");
                    }
                    server.sockets[user.id] = null;

                    // remove user from room
                    room.listeners = _.filter(room.listeners, function (l) {
                        return user.id != l.id;
                    });

                    // bail
                    return;
                }

                /* we're now connected */
                server.sockets[user.id] = socket;

                console.log(("--> " + user.name + " connected to room ").cyan + room.name.green);

                server.updateRecentRoomList(user, room);

                // remove this listener from the room if they're already here (e.g. after a connection issue)
                room.listeners = _.filter(room.listeners, function (listener) {
                    return listener.id != user.id;
                });

                // increase visits count
                if (!room.visits) {
                    room.visits = 1;
                } else {
                    room.visits++;
                }

                // notify existing listeners that we have a join
                server.broadcast(room, [{type: "join", payload: server.simpleUser(user)}]);

                // now add the new listener
                room.listeners.push(user);

                soundbounceShared.updatePlaylist(room, server);

                // if we're the first joiner, update top-up list
                if (room.listeners.length == 1 && room.topUpURI) {
                    console.log("topping up room for first joiner " + room.name);
                    server.topUpRoomWithPlaylist(room, room.topUpURI);
                }

                // send initial sync of room state and user info
                try {
                    socket.send(JSON.stringify([server.createSyncMessage(room, user)]));
                } catch (err) {
                    console.log("socket error for sync send to ".red + user.name + ", " + err + " - closing socket");
                    socket.close();
                    server.sockets[user.id] = null;
                    return;
                }

                // setup pinger to keep firewalls open
                var pingTimerId = setInterval(function () {
                    try {
                        socket.send('[{"type":"ping"}]');
                    }
                    catch (err) {
                        console.error("unable to send ping to client " + user.name + ", closing socket");
                        try {
                            socket.close();
                        } catch (errr) {
                        }
                        clearInterval(pingTimerId);
                        server.sockets[user.id] = null;
                        // remove user from room
                        room.listeners = _.filter(room.listeners, function (l) {
                            return user.id != l.id;
                        });
                        return;

                    }
                }, 5000);

                socket.on('close', function () {
                    console.log(("<-- " + user.name + " left room ").magenta + room.name);
                    server.sockets[user.id] = null;

                    //stop pinging
                    clearInterval(pingTimerId);
                    // remove this listener from the room
                    room.listeners = _.filter(room.listeners, function (listener) {
                        return listener.id != user.id;
                    });

                    // broadcast to remaining listeners that they've gone
                    server.broadcast(room, [{type: "leave", payload: user.id}]);
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
                        case "star":
                            server.processStar(room, user, msg.payload);
                            break;
                        case "chat":
                            server.processChat(room, user, msg.payload);
                            break;
                        case "remove-track":
                            server.processRemove(room, user, msg.payload);
                            break;
                        case "vote-to-skip-track":
                            server.processVoteToSkip(room, user, msg.payload);
                            break;
                    }
                })
            });
        });

        //server.deleteUnusedRooms();

        console.log('Startup OK'.green);

        // top up rooms every 15 mins
        setInterval(function () {
            server.topUpRooms();
        }, 1000 * 60 * 15);

        // save data every X minutes
        setInterval(function () {
            console.log("[backup]".green + "saving data....");
            //    server.saveDataAsync();
            try {
                server.saveData();
                console.log("[backup]".green + " done");
            } catch (err) {
                console.log("[backup]".green + " error".red, err);
            }
        }, 1000 * 60 * 30);

        // update playlists every 10 seconds so all tracks recycle properly
        setInterval(function () {
            server.rooms.forEach(function (room) {
                soundbounceShared.updatePlaylist(room, server);
            });
        }, 1000 * 10);

        // topup in 15 seconds after startup, once lists have recycled tracks as appropriate
        _.delay(function () {
            server.topUpRooms();
        }, 15000);
    },

    // WARNING: don't activate this again until it has a check to not delete very new rooms that haven't been used much yet
    deleteUnusedRooms: function () {
        var server = this;
        var roomsToRemove = [];

        _.each(server.rooms, function (room) {
            // if it's not auto-topping up, has not had many visits or adds...
            if (!room.topUpURI && (room.visits < 15 || room.chat.length < 15)) {
                roomsToRemove.push(room);
            }
        });

        _.each(roomsToRemove, function (room) {
            console.log("will remove " + room.name + "...");
            var roomIndex = server.rooms.indexOf(room);

            var removedRoom = server.rooms.splice(roomIndex, 1);
            console.log("done - removed (index " + roomIndex + ", " + removedRoom.name + ")");
        });

        console.log("removed " + roomsToRemove.length + " rooms");

    },

    getSimpleRoom: function (room) {
        return {
            id: room.id,
            name: room.name,
            listeners: room.listeners.length,
            nowPlaying: room.tracks.length > 0 ? room.tracks[0] : null,
            color: room.color,
            description: room.description,
            visits: room.visits ? room.visits : 0
        };
    },

    findRoomById: function (roomId) {
        var server = this;
        return _.find(server.rooms, function (room) {
            return room.id == roomId;
        });
    },

    findUserById: function (userId) {
        var server = this;
        return _.find(server.users, function (user) {
            return user.id == userId;
        });
    },

    updateRecentRoomList: function (userParam, room) {
        var user = this.findUserById(userParam.id);
        if (_.isUndefined(user.recentRooms)) {
           // console.log("updateRecentRoomList undefined");
            user.recentRooms = [];
        }

        // remove entry if already present
        user.recentRooms = _.filter(user.recentRooms, function (recent) {
            return recent.id != room.id;
        });

        // insert at front of list
        user.recentRooms.splice(0,0,{id: room.id, timestamp: new Date()});

        if (user.recentRooms.length > this.MAX_RECENT_ROOMS) {
            user.recentRooms = _.first(user.recentRooms, this.MAX_RECENT_ROOMS);
        }
      //  console.log("updateRecentRoomList done - ",user.recentRooms);

    },

    deleteRoom: function (room, user) {
        var server = this;

        var roomIndex = server.rooms.indexOf(room);

        // remove this user from the room before we send the broadcast
        room.listeners = _.filter(room.listeners, function (listener) {
            return listener.id != user.id;
        });

        // broadcast to the room that it's gone
        server.broadcast(room, [{type: 'error', payload: 'Room has been deleted'}]);

        // remove the room
        server.rooms.splice(roomIndex, 1);
        console.log("" + room.name.red + " deleted by " + user.name);

    },

    processRemove: function (room, user, trackId) {
        // find track
        var trackToRemove = _.find(room.tracks, function (t) {
            return t.id == trackId;
        });
        if (!trackToRemove)
            return;

        // must be room admin or the person who added track
        if (!(_.contains(room.admins, user.id) || trackToRemove.addedBy.id == user.id))
            return;

        if (room.tracks[0].id == trackId) {
            // this is currently playing, so reset position
            room.currentTrackStartedAt = soundbounceShared.serverNow();
            room.currentTrackPosition = 0;
        }

        room.tracks = _.filter(room.tracks, function (t) {
            return t.id != trackId;
        });
        this.reSyncAllUsers(room);
    },

    processVoteToSkip: function (room, user, trackId) {
        console.log("processVoteToSkip for trackId " + trackId + " in room " + room.name);

        if (!room.tracks[0].votesToSkip) {
            room.tracks[0].votesToSkip = [];
        }

        // Only do anything if the voted to skip track is the currently playing track in this room
        if (room.tracks[0].id == trackId) {

            // Add the user to the list of people who voted to skip this track if they aren't already in it, in case we want to display that info in future
            if (!_.contains(room.tracks[0].votesToSkip, user.id)) {
                room.tracks[0].votesToSkip.push(user.id);
            }
            else {
                // already voted to skip
                return;
            }

            var trackToSkip = room.tracks[0];

            var chatmsg = {
                type: "chat",
                id: shortId(),
                message: user.name + " voted to skip " + trackToSkip.name + ".",
                timestamp: (new Date()),
                user: soundbounceServer.getSoundbounceUser(),
                context: trackToSkip
            };

            soundbounceShared.addChatToRoom(room, chatmsg);

            soundbounceServer.broadcast(room, [{type: "chat", payload: chatmsg}]);

            // If there are now more votes to skip than there were votes to play this track, skip it
            if (trackToSkip.votesToSkip.length > trackToSkip.votes.length) {
                // Move the currently playing track to end of room playlist
                var skippedTrack = room.tracks.shift();
                skippedTrack.votes = []; // strip votes

                // let server handle whether to recycle or not
                //server.handleRemovedTrack(skippedTrack, room);

                // Reset room current track playback position so the new currently playing track starts at the beginning
                room.currentTrackStartedAt = soundbounceShared.serverNow();
                room.currentTrackPosition = 0;


                var chatmsg = {
                    type: "chat",
                    id: shortId(),
                    message: trackToSkip.name + " skipped by " + trackToSkip.votesToSkip.length + " vote" + (trackToSkip.votesToSkip.length > 1 ? "s" : "") + ".",
                    timestamp: (new Date()),
                    user: soundbounceServer.getSoundbounceUser(),
                    context: trackToSkip
                };

                soundbounceShared.addChatToRoom(room, chatmsg);

                this.reSyncAllUsers(room);
            }
        }

        console.log("DONE: processVoteToSkip for trackId " + trackId + " in room " + room.name);

    },

    reSyncAllUsers: function (room) {

        soundbounceShared.updatePlaylist(room, server);

        var server = this;
        // send a sync message to each connected user
        room.listeners.forEach(function (listener) {
            // has the socket been dropped?
            if (!soundbounceServer.sockets[listener.id]) {
                // remove user from room
                room.listeners = _.filter(room.listeners, function (l) {
                    return listener.id != l.id;
                });
                return;
            }

            try {
                soundbounceServer.sockets[listener.id].send(JSON.stringify([server.createSyncMessage(room, listener)]));
            } catch (err) {
                console.log("resync socket.send failed for listener " + listener.id + " in room " + room.name);
            }
        });
    },

    createSyncMessage: function (room, user) {
        return {
            type: 'sync',
            payload: this.getClientViewOfRoom(room),
            user: user,
            now: new Date()
        }
    },

    getRandomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // recycle tracks that were added by users, if there's room in playlist
    handleRemovedTrack: function (track, room) {
        var server = this;
        //  console.log(room.name.green + " handleRemovedTrack " + track.name + "" + track.addedBy.id);

        // if there's room, and it wasn't added by soundbounce automatically
        if (room.tracks.length < server.RECYCLE_TRACKS_WHEN_PLAYLIST_HAS_LESS_THAN && track.addedBy.id != "1") {
            //    console.log("recycling track "+track.name+" in room "+room.name);
            // console.log(room.name.green + " recycling " + track.name + "");
            // add in a few moments, to avoid it appearing before track ends for clients that are slightly behind
            _.delay(function () {
                //  console.log("adding track... " + track.name + "");
                server.processAdds(room, track.addedBy, [track.id], true);
                //  console.log(room.name.green + " re-added " + track.name + "");

            }, 2000 + (Math.random() * 3000)); // random delay to top up
        }
    },

    topUpRooms: function () {
        var server = this;
        console.log("[topup]".green + " topping up rooms....");

        // always update playlists
        _.forEach(server.rooms, function (room) {
            soundbounceShared.updatePlaylist(room, server);
        });

        console.log("[topup]".green + " auto topping up only empty rooms or rooms with listeners");

        var rateLimitDelay = 0;

        // automatically top up rooms using linked playlists

        _.forEach(server.rooms, function (room) {

            // only top up if it has listeners or 0 tracks
            if (!_.isEmpty(room.topUpURI) && (room.listeners.length > 0 || room.tracks.length == 0)) {
                var theRoom = room;
//                console.log("[topup]".green + " will top up "+theRoom.name);

                setTimeout(function () {
                    console.log("[topup]".green + " topping up " + theRoom.name);

                    server.topUpRoomWithPlaylist(theRoom, theRoom.topUpURI);
                }, rateLimitDelay += 500);
            }
        });

    },

    topUpRoomWithPlaylist: function (room, playlistURI) {
        var TOP_UP_TRACKS_TO_ADD = 50;
        var server = this;

        if (_.isEmpty(playlistURI)) {
            return;
        }


        if (room.tracks.length < server.TOP_UP_WHEN_TRACKS_BELOW) {
            // we need to top up! go get the playlist
            var uriSplit = playlistURI.split(':');
            var userId = uriSplit[2];
            var playlistId = uriSplit[4];

            if (playlistURI.indexOf("spotify:") != 0 || playlistURI.indexOf("playlist:") == -1 || playlistURI.indexOf(":starred") > -1) {
                // only support spotify URI
                return;
            }


            server.spotify.clientCredentialsGrant()
                .then(function (data) {
                    server.spotifyAccessToken = data['access_token'];
                    server.spotify.setAccessToken(server.spotifyAccessToken);

                    //  console.log("[top-up] ".green, room.name, room.tracks.length);
                    server.spotify.getPlaylistTracks(userId, playlistId)
                        .then(function (data) {

                            // console.log("[top-up] ".green, room.name, room.tracks.length, data.total);
                            var offset = 0;
                            if (data.total > 100) {
                                offset = server.getRandomInt(0, data.total - 100);
                            }
                            _.delay(function () {
                                //console.log("[top-up] " + room.name.yellow, "offset: ", offset);
                                server.spotify.getPlaylistTracks(userId, playlistId, {
                                    offset: offset,
                                    limit: 100
                                }).then(function (data) {
                                    try {
                                        var simpleUser = server.getSoundbounceUser();

                                        var tracksToAdd = _.first(_.shuffle(data.items), TOP_UP_TRACKS_TO_ADD);

                                        var trackIds = [];
                                        _.each(tracksToAdd, function (spotifyTrackAdd) {
                                            var spotifyTrack = spotifyTrackAdd.track;
                                            try {
                                                var simpleTrack = soundbounceShared.simpleTrack(spotifyTrack);


                                                if (_.find(room.tracks, function (t) {
                                                        return t.id == simpleTrack.id;
                                                    }) != null) {
                                                    // track is already in room, so skip
                                                    return;
                                                }

                                                // is it already in add list (i.e. a dupe in the top-up list)?
                                                if (!_.contains(trackIds, simpleTrack.id)) {
                                                    trackIds.push(simpleTrack.id);
                                                }
                                            } catch (err) {
                                                // issue with particular track, ignore
                                            }
                                        });

                                        if (!_.isEmpty(trackIds)) {
                                            if (offset > 0) {
                                                //         console.log("[top-up] ".green, room.name.yellow, "1st: "+data.items[0].track.name);
                                            }
                                            server.processAdds(room, simpleUser, trackIds);
                                        }
                                    }
                                    catch
                                        (err) {
                                        console.log("error topping up " + room.name + ": " + err);
                                        console.log(err.stack);
                                    }
                                });
                            }, 100 + Math.random() * 200);
                        },
                        function (err) {
                            console.log('topup:', '[' + playlistURI + ']', "for room: ", room.name + ".", err);
                        }
                    );
                });
        }
    },

    getSoundbounceUser: function () {
        return {
            id: "1",
            name: "Soundbounce",
            img: '/img/soundbounce.png'
        };
    },

    processStar: function (room, user, payload) {

        var server = this;
        var nowPlaying = null;

        // make sure we have correct now playing track
        soundbounceShared.updatePlaylist(room, server);


        if (room.tracks.length > 0) {
            nowPlaying = room.tracks[0];
        }

        var chatmsg = {
            type: "star",
            id: shortId(),
            track: payload,
            timestamp: soundbounceShared.serverNow(),
            user: this.simpleUser(user),
            context: nowPlaying
        };

        soundbounceShared.addChatToRoom(room, chatmsg);

        soundbounceServer.broadcast(room, [{type: "chat", payload: chatmsg}]);

    },

    processChat: function (room, user, payload) {

        var server = this;
        var nowPlaying = null;

        // make sure we have correct now playing track
        soundbounceShared.updatePlaylist(room, server);

        if (room.tracks.length > 0) {
            nowPlaying = room.tracks[0];
        }

        if (_.isEmpty(payload.message.trim()))
            return;

        // check for server commands
        if (payload.message[0] == "/") {
            this.processChatCommand(room, user, payload.message);
            return;
        }

        var chatmsg = {
            type: "chat",
            id: shortId(),
            message: payload.message,
            timestamp: (new Date()),
            user: this.simpleUser(user),
            context: nowPlaying
        };

        console.log("[" + room.name.green + "]" + user.name + ": " + payload.message);

        soundbounceShared.addChatToRoom(room, chatmsg);

        soundbounceServer.broadcast(room, [{type: "chat", payload: chatmsg}]);
    },

    processChatCommand: function (room, user, message) {
        var server = this;
        var serverCommands = [
            {name: "clearall", handler: this.commandClearAll, admin: true},
            {name: "shuffle", handler: this.commandShuffle, admin: true},
            {name: "listadmins", handler: this.commandListAdmins},
            {name: "addadmin", handler: this.commandAddAdmin, admin: true},
            {name: "removeadmin", handler: this.commandRemoveAdmin, admin: true},
            {name: "topup", handler: this.commandTopUp, admin: true},
            {name: "deleteroom", handler: this.commandDeleteRoom, admin: true},
            {name: "me", handler: this.commandMe},
            {name: "find", handler: this.commandFind}
        ];

        var foundCommand = false;
        serverCommands.forEach(function (command) {
            if (message.indexOf('/' + command.name) == 0) {
                if (command.admin) {
                    if (!(_.contains(room.admins, user.id) || _.contains(server.superAdmins, user.id))) {
                        server.sendPrivateChat(room, user.id, "Nice try, you must be a room admin to use the command /" + command.name);
                        foundCommand = true;
                        return;
                    }
                }
                var boundHandler = _.bind(command.handler, server);
                boundHandler(room, user, message.substr(command.name.length + 2).trim());
                foundCommand = true;
            }
        });

        if (message.indexOf("/commands") == 0) {
            foundCommand = true;
            server.sendPrivateChat(room, user.id, "I understand the following:");
            serverCommands.forEach(function (command) {
                server.sendPrivateChat(room, user.id, "/" + command.name);
            });
            return;
        }

        if (message.indexOf("/deleteuser ") == 0 && _.contains(server.superAdmins, user.id)) {

            var params = message.substr(12).trim();

            var userToDelete = _.find(server.users, function (l) {
                return l.spotifyUsername.toLowerCase() == params.toLowerCase();
            });

            if (!userToDelete) {
                this.sendPrivateChat(room, user.id, "Unknown user: " + params);
                return;
            }

            server.users = _.filter(server.users, function (user) {
                return user.id != userToDelete.id;
            });

            this.sendPrivateChat(room, user.id, userToDelete.name + " has been deleted");
            foundCommand = true;
        }

        if (!foundCommand) {
            this.sendPrivateChat(room, user.id, "No such command: " + message);
        }
    },

    commandClearAll: function (room, user, params) {
        if (room.tracks.length == 0)
            return;

        var nowPlaying = room.tracks[0];
        room.tracks = [nowPlaying];

        soundbounceServer.reSyncAllUsers(room);
    },

    commandShuffle: function (room, user, params) {
        if (room.tracks.length == 0)
            return;

        // strip votes + shuffle
        var nowPlaying = room.tracks[0];
        var newTracks = [nowPlaying];
        _.shuffle(_.rest(room.tracks)).map(function (track) {
            newTracks.push(_.extend(track, {votes: []}));
        });

        room.tracks = newTracks;

        this.reSyncAllUsers(room);
        this.sendPrivateChat(room, user.id, "Playlist shuffled, votes removed");
    },

    commandTopUp: function (room, user, params) {
        if (_.isEmpty(params))
            params = room.topUpURI;

        if (_.isEmpty(params)) {
            this.sendPrivateChat(room, user.id, "Usage: /topup spotify:playlist:uri - room has no auto top-up");
            return;
        }

        this.topUpRoomWithPlaylist(room, params);
        this.sendPrivateChat(room, user.id, "Topping up playlist.");
    },

    commandListAdmins: function (room, user, params) {
        var server = this;
        server.sendPrivateChat(room, user.id, "Admins of '" + room.name + "'");
        room.admins.map(function (adminId) {
            server.sendPrivateChat(room, user.id, " - " + _.find(server.users, function (u) {
                    return u.id == adminId;
                }).name);
        });
    },

    commandRemoveAdmin: function (room, user, params) {
        if (_.isEmpty(params)) {
            this.sendPrivateChat(room, user.id, "Usage: /removeadmin john smith");
            return;
        }
        var removeAdmin = _.find(room.listeners, function (l) {
            return l.name.toLowerCase() == params.toLowerCase();
        });

        if (!removeAdmin) {
            this.sendPrivateChat(room, user.id, "No connected user: " + params);
            return;
        }

        if (!_.contains(room.admins, removeAdmin.id)) {
            this.sendPrivateChat(room, user.id, removeAdmin.name + " is not a room admin anyway");
            return;
        }

        if (removeAdmin.id == user.id) {
            this.sendPrivateChat(room, user.id, "You cannot remove yourself as an admin.");
            return;
        }

        // remove admin
        room.admins = _.filter(room.admins, function (id) {
            return id != removeAdmin.id;
        });

        this.sendPrivateChat(room, user.id, removeAdmin.name + " is no longer an admin");
    },

    commandAddAdmin: function (room, user, params) {
        if (_.isEmpty(params)) {
            this.sendPrivateChat(room, user.id, "Usage: /addadmin john smith");
            return;
        }
        var newAdmin = _.find(room.listeners, function (l) {
            return l.name.toLowerCase() == params.toLowerCase();
        });

        if (!newAdmin) {
            this.sendPrivateChat(room, user.id, "No connected user: " + params);
            return;
        }

        if (_.contains(room.admins, newAdmin.id)) {
            this.sendPrivateChat(room, user.id, newAdmin.name + " is already a room admin");
            return;
        }

        room.admins.push(newAdmin.id);

        this.sendPrivateChat(room, user.id, newAdmin.name + " is now an admin");
    },

    commandDeleteRoom: function (room, user, params) {
        if (_.isEmpty(params) || params != "confirm-delete") {
            this.sendPrivateChat(room, user.id, "Usage: /deleteroom confirm-delete (Room will disappear forever!)");
            return;
        }

        this.deleteRoom(room, user);
        this.sendPrivateChat(room, user.id, "This room has been deleted.  Time for you to leave!");

    },

    commandDeleteUser: function (room, user, params) {
        var server = this;
        if (_.isEmpty(params)) {
            this.sendPrivateChat(room, user.id, "Usage: /find john smith");
            return;
        }

        // check user exists in system
        var systemUser = _.find(server.users, function (u) {
            return u.name && (u.name.toLowerCase() == params.toLowerCase());
        });

        if (!systemUser) {
            server.sendPrivateChat(room, user.id, "User '" + params + "' does not exist.");
            return;
        }

        var foundUser = null;

        server.rooms.forEach(function (room) {
            if (foundUser)
                return; // we've already found the user in another room

            foundUser = _.find(room.listeners, (function (listener) {
                return listener.name.toLowerCase() == params.toLowerCase();
            }));
            if (foundUser) {
                server.sendPrivateChat(room, user.id, foundUser.name + " is listening to music in room '" + room.name + "'");
                return false;
            }
        });
        if (!foundUser)
            server.sendPrivateChat(room, user.id, "" + systemUser.name + " is not currently listening to Soundbounce.");
    },

    commandFind: function (room, user, params) {
        var server = this;
        if (_.isEmpty(params)) {
            this.sendPrivateChat(room, user.id, "Usage: /find john smith");
            return;
        }

        // check user exists in system
        var systemUser = _.find(server.users, function (u) {
            return u.name && (u.name.toLowerCase() == params.toLowerCase());
        });

        if (!systemUser) {
            server.sendPrivateChat(room, user.id, "User '" + params + "' does not exist.");
            return;
        }

        var foundUser = null;

        server.rooms.forEach(function (room) {
            if (foundUser)
                return; // we've already found the user in another room

            foundUser = _.find(room.listeners, (function (listener) {
                return listener.name.toLowerCase() == params.toLowerCase();
            }));
            if (foundUser) {
                server.sendPrivateChat(room, user.id, foundUser.name + " is listening to music in room '" + room.name + "'");
                return false;
            }
        });
        if (!foundUser)
            server.sendPrivateChat(room, user.id, "" + systemUser.name + " is not currently listening to Soundbounce.");
    },

    commandMe: function (room, user, params) {
        var server = this;
        if (_.isEmpty(params)) {
            this.sendPrivateChat(room, user.id, "Usage: /me is coding");
            return;
        }

        var nowPlaying = null;

        // make sure we have correct now playing track
        soundbounceShared.updatePlaylist(room, server);

        if (room.tracks.length > 0) {
            nowPlaying = room.tracks[0];
        }

        var chatmsg = {
            type: "me",
            id: shortId(),
            message: params,
            timestamp: (new Date()),
            user: this.simpleUser(user),
            context: nowPlaying
        };

        console.log("[" + room.name.green + "]" + " me from " + user.name + ": " + params);

        soundbounceShared.addChatToRoom(room, chatmsg);

        soundbounceServer.broadcast(room, [{type: "chat", payload: chatmsg}]);
    },

    sendPrivateChat: function (room, userId, message) {
        var chatmsg = {
            type: "chat",
            id: shortId(),
            message: message,
            timestamp: (new Date()),
            user: this.getSoundbounceUser(),
            context: null
        };
        try {
            soundbounceServer.sockets[userId].send(JSON.stringify([{type: "chat", payload: chatmsg}]));
        } catch (err) {
            console.log("send private chat failed in socket.send for user " + userId);
        }
    },

    processAdds: function (room, user, trackIds, dontVote) {

        var server = this;
        // spotify API limited to 50 tracks.
        trackIds = _.first(trackIds, 50);

        // remove querystrings e.g. ?action=browse
        trackIds = trackIds.map(function (t) {
            if (t)
                return t.split("?")[0];
            else
                return null;
        });

        trackIds = _.compact(trackIds);

        //console.log(user.name + " added/voted " + trackIds.length + " tracks in " + room.name, trackIds);

        var voteList = [];

        this.spotify.getTracks(trackIds)
            .then(function (data) {
                var tracks = data.tracks;
                if (_.isEmpty(tracks))
                    return;

                var messages = [], simpleTracks = [];

                var canAdd = room.tracks.length < server.ROOM_MAX_TRACKS;

                try {
                    // todo: log all adds + votes to disk
                    var simpleUser;
                    tracks.forEach(function (spotifyTrack) {
                        if (_.isEmpty(spotifyTrack))
                            return;

                        var simpleTrack = soundbounceShared.simpleTrack(spotifyTrack);

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
                        simpleTrack.addedAt = new Date();

                        if ((String(user.id) != "1") && !dontVote) {
                            // vote for the track, but don't trigger a vote event
                            var vote = simpleUser;
                            vote.timestamp = new Date();
                            simpleTrack.votes.push(vote);
                        }

                        // which track are we inserting after
                        simpleTrack.insertAfter = soundbounceServer.getTrackIdToInsertAfter(room, simpleTrack.votes.length);

                        simpleTracks.push(simpleTrack);

                        if (canAdd) {
                            // add it to the room on the server
                            soundbounceShared.addTrackToRoom(room, simpleTrack, simpleUser, server);
                        }
                    });

                    if (canAdd) {
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

    simpleUser: function (user) {
        return {id: user.id, name: user.name, img: user.img, spotifyUsername: user.spotifyUsername};
    },

    processVotes: function (room, user, trackIds) {

        var server = this;
        var votes = [];
        trackIds.map(function (tid) {
            return _.find(room.tracks, function (t) {
                return t.id == tid;
            });
        }).forEach(function (track) {
            if (track) {
                //    console.log(user.name + " voted for " + track.name);

                // add the vote to the server, and note which track we're going to put it after
                var insertAfter = soundbounceServer.addVoteToTrack(room, track, soundbounceServer.simpleUser(user));
                if (!insertAfter) {
                    return;
                }

                // now tell the room we have a vote, and where to move it to
                votes.push({
                    trackId: track.id,
                    moveToAfter: insertAfter,
                    user: soundbounceServer.simpleUser(user)
                });
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
        var server = this;

        soundbounceShared.updatePlaylist(room, server);

        var insertAfter = this.getTrackIdToInsertAfter(room, track.votes.length + 1);

        var currentIndex = _.indexOf(room.tracks, track);

        if (currentIndex == 0) {
            // can't vote on the playing track
            console.warn("addVoteToTrack - can't vote for playing track, aborting.");
            return;
        }

        if (_.contains(track.votes.map(function (v) {
                return v.id;
            }), user.id)) {
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
            // console.log("vote - move to after " + insertAfter + ", indices: ", currentIndex, insertIndex);
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

            try {
                soundbounceServer.sockets[listener.id].send(JSON.stringify(messages));
            } catch (err) {
                console.log("failed to broadcast (socket.send) to " + listener.id);
                try {
                    soundbounceServer.sockets[listener.id].close()
                } catch (errr) {
                }
                // drop the socket
                soundbounceServer.sockets[listener.id] = null;
            }

            // has the socket been dropped?
            if (!soundbounceServer.sockets[listener.id]) {
                // remove user from room
                room.listeners = _.filter(room.listeners, function (l) {
                    return listener.id != l.id;
                });
                return;
            }
        });
    },

    shutdown: function () {
        console.log("\n Shutting down, saving JSON...");
        this.saveData();
        console.log("Shutdown OK ".bgGreen.white);
    },

    saveData: function () {
        // save files to disk
        // save backups first to history folders

        var usersJson = JSON.stringify(this.users, null, "\t");
        var roomsJson = JSON.stringify(this.rooms);

        // don't worry about saving history errors on local builds
        try {
            fs.writeFileSync(this.getNewHistoryFileName("users"), usersJson);
            fs.writeFileSync(this.getNewHistoryFileName("rooms"), roomsJson);
        }catch(historyErr){

        }

        fs.writeFileSync(this.userStoreFileName, usersJson);
        fs.writeFileSync(this.roomStoreFileName, roomsJson);
    },

    saveDataAsync: function () {
        // save files to disk without blocking
        // save backups first to history folders

        var usersJson = JSON.stringify(this.users, null, "\t");
        var roomsJson = JSON.stringify(this.rooms);

        fs.writeFile(this.getNewHistoryFileName("users"), usersJson);
        fs.writeFile(this.getNewHistoryFileName("rooms"), roomsJson);

        fs.writeFile(this.userStoreFileName, usersJson);
        fs.writeFile(this.roomStoreFileName, roomsJson);
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

process.on('uncaughtException', function (err) {
    if (String(err) == "Error: not opened") {
        console.log("Not opened exception!!!".red);
    }
    console.log('Uncaught exception: ' + err);
    console.log("Stack: " + err.stack);
    console.log("Saving before restart...");
    soundbounceServer.saveData();
    console.log("Saved, restarting...");
    process.exit(1);
});

module.exports = soundbounceServer;