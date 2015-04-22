/**
 * Shared functions between client and server
 *
 * Created by pb on 24/11/2014.
 */

var _ = _ ? _ : require('underscore')
    , moment = moment ? moment : require('moment');

Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

var soundbounceShared = {

    MAX_CHAT_HISTORY: 150,
    /*  MAX_CHAT_VOTE_HISTORY:100,*/

    timeAdjust: 0,

    serverNow: function () {
        return new Date((new Date()).getTime() + this.timeAdjust);
    },

    // makes sure the correct song is at the top of the playlist, starts playing new adds, and removes played songs
    // returns true if the playlist has changed, false if it hasn't
    updatePlaylist: function (room, server) {
        var done = false;
        var hasUpdatedPlaylist = false;
        while (!done) {
            done = true;

            if (room == null)
                return;

            // if we're out of tracks, bail
            if (_.isEmpty(room.tracks)) {
                room.currentTrackStartedAt = null;
                return true;
            }

            // now we have at least one track on list
            // check if the top track is playing (probably a new add to a blank playlist if its not, so start it)
            if (!room.currentTrackStartedAt) {
                // set top track to play
                room.currentTrackStartedAt = this.serverNow();
                room.currentTrackPosition = 0;
                return true;
            }

            // if we get here we have a track currently "playing"
            var nowPlaying = room.tracks[0];
            var startedAt = moment(new Date(room.currentTrackStartedAt));
            var now = moment(this.serverNow());

            // how far in are we?
            var msPlayed = moment.duration(now - startedAt).asMilliseconds();


            // the top song has finished
            if (msPlayed > nowPlaying.length) {
                // remove the top playin track after setting the next track to start exactly after this one

                //  console.log(room.name+" track " + nowPlaying.name+" stopped.");
                if (room.tracks.length > 1) {
                    // not last track so set start time
                    room.currentTrackStartedAt = startedAt.add(nowPlaying.length, "ms");
                }
                else {
                    // last track, we're done
                    room.currentTrackStartedAt = null;
                }

                // reset position, remove top track
                room.currentTrackPosition = 0;
                var trackRemoved = room.tracks.shift();

                // the server may want to re-add this track, so let it know (if we're on the server, remember this code could be running on client!)
                if (server) {
                    try {
                        server.handleRemovedTrack(trackRemoved, room);
                    } catch (err) {
                        console.log("error re-adding track " + trackRemoved.name + " in room " + room.name);
                    }
                }

                // and loop around, update again
                done = false;
                hasUpdatedPlaylist = true;
            }
            else {
                //    console.log(room.name+" currently ", msPlayed, "ms into track " + nowPlaying.name);
                room.currentTrackPosition = msPlayed;
                return hasUpdatedPlaylist;
            }

            hasUpdatedPlaylist = true;
        }
        return true;
    },

    // shared code when adding to a room
    addTrackToRoom: function (room, track, user, server) {

        this.updatePlaylist(room, server);

        var insertIndex = 0;
        if (track.insertAfter) {

            for (var i = 0; i < room.tracks.length; i++) {
                if (room.tracks[i].id == track.insertAfter) {
                    insertIndex = i + 1;
                }
            }
        }

        if (room.tracks.length > 0 && insertIndex == 0) {
            // you can't insert above the playing track, even if it has more votes.
            insertIndex = 1;
        }

        if (String(user.id) != "1" && track.votes.length > 0) {
            this.addChatToRoom(room, {type: "add", timestamp: this.serverNow(), user: user, track: track});
        }

        room.tracks.splice(insertIndex, 0, track);
    },

    addChatToRoom: function (room, chat) {

        room.chat.push(chat);

        if (room.chat.length > this.MAX_CHAT_HISTORY) {
            var cullBy = room.chat.length - this.MAX_CHAT_HISTORY;
            //      console.log("culling chat in "+room.name+" by "+cullBy);
            // remove from the start of the array
            room.chat = _.last(room.chat, this.MAX_CHAT_HISTORY);//( cullBy);

        }
    },

    // voting chat is shared
    addVoteChat: function (room, track, user) {
        this.addChatToRoom(room, {type: "vote", timestamp: this.serverNow(), user: user, track: track});
    },

    simpleTrack: function (spotifyTrack) {
        var imgUrl = '/img/empty-artwork.png';

        if (spotifyTrack.album.images.length > 1) {
            imgUrl = spotifyTrack.album.images[1].url;
        } else if (spotifyTrack.album.images.length > 0) {
            imgUrl = spotifyTrack.album.images[0].url;
        }

        return {
            id: spotifyTrack.id,
            name: spotifyTrack.name,
            img: imgUrl,
            artists: spotifyTrack.artists.map(function (artist) {
                return {id: artist.id, name: artist.name};
            }),
            length: spotifyTrack.duration_ms,
            addedBy: {},
            votes: [],
            votesToSkip: []
        }
    }

};

// require doesn't export on client, only server
if (typeof module === "object") module.exports = soundbounceShared;