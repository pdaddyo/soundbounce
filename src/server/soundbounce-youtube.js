/**
 * Created by pb on 01/04/2015.
 */
"use strict";

var config = require('./config')
    , session = require('express-session')
    , express = require('express')
    , fileSessionStore = require('./session-store')(session)
    , fs = require('fs')
    , _ = require('underscore')
    , colors = require('colors')
    , crypto = require('crypto')
    , moment = require('moment')
    , soundbounceShared = require('./public/js/shared.js')
    , shortId = require('shortid')
    , request = require('request');


var youtube= {
    server:null,

    app:null,

    init: function (app, soundbounceServer){
        this.app = app;
        var server = this.server = soundbounceServer;


        app.get('/youtube', function (req, res) {
            var roomName = req.query["room"] ? req.query["room"] : "Liquifaction";

            var room = _.find(server.rooms, function (room){ return room.name.toLowerCase() == roomName.toLowerCase(); });

            if(!room){
                res.send("can't find room '"+roomName+"'.");
                return;
            }

            //update the playlist so defo have current playing track
            soundbounceShared.updatePlaylist(room, server);


            // we now have a room
            var track = room.tracks[0];

            if(!track){
                res.send("no playing track in "+roomName);
                return;
            }

            var startSecs = Math.floor(room.currentTrackPosition/1000);
            if(startSecs<10)
                startSecs = 0;

            var secsLeft = Math.floor(track.length/1000) - startSecs + 2;

            if(secsLeft<0)
            {
                // something has gone wrong!
                secsLeft = 0;
            }

            // try and get the youtube vid
            youtube.getVideoId(track, function (id){
                if(!id)
                    return;
                res.send('<html><head><meta http-equiv="refresh" content="'+secsLeft+'"><style>body,html{margin:0; padding:0;}</style></head><body><iframe id="player" type="text/html" width="100%" height="100%" src="http://www.youtube.com/embed/'+id+'?autoplay=1&start='+startSecs+'&enablejsapi=1&origin=http://app.soundbounce.org" frameborder="0"></iframe>');
            }, function(error){
                res.send(error);
            });
        });
    },

    getVideoId: function (track, success, fail){
        var q = track.artists[0].name+" - "+track.name;

        console.log("requesting from youtube api: '"+q+"'");
        request('https://www.googleapis.com/youtube/v3/search?part=snippet&q='+escape(q)+'&key='+config.youtube.apiKey, function (error, response, body){
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                var vidId = null;
                try{
                    vidId = data.items[0].id.videoId;
                }catch(e){}

                if(vidId)
                    success(vidId);
            }
            else{
                fail("error:"+ error);
            }
        })
    }
};

module.exports = youtube;