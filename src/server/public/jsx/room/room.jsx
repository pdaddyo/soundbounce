var RoomPage = React.createClass({
    UPDATE_STATE_DELAY: 500,
    socket: null,
    intervalId: null,
    lastPlayedTrackId: null,
    hasSynced: false,

    componentDidMount: function () {
        var host = window.document.location.host.replace(/:.*/, '');
        this.socket = new ReconnectingWebSocket('ws://' + host + '/' + this.props.roomid);
        var component = this;

        this.socket.onmessage = (function (event) {
            var json = JSON.parse(event.data);
            if (json.error) {
                alert(json.error);
            }

            //    console.log("server-->client json:",json);
            json.forEach(function (message) {
                component.handleMessage(message);
            });
        }).bind(this);

        this.socket.onerror = function (err) {
            router.alert("An error occurred whilst connecting to the room: " + err + ", perhaps WebSockets are blocked by a corporate firewall?", "Ooops, something went wrong...");
        }

        this.setupEvents();

        this.intervalId = setInterval(this.tick, this.UPDATE_STATE_DELAY);
    },

    setupEvents: function () {
        var component = this;
        $(window).on("resize.room", function () {
            //       component.updateScrollbars();
        });

        eventbus.on("send-chat", function (chatText) {
            component.send({type: "chat", payload: {message: chatText}});
        });

        eventbus.on("update-scrollbars", function () {
            //      component.updateScrollbars();
        });

        eventbus.on("edit-room", function () {
            if (_.contains(component.state.room.admins, component.state.user.id)) {
                router.showModal(<RoomEdit room={component.state.room} />);
            }
            else {
                // todo: better error message or hide the button
                router.alert("You are not an administrator of this room", "Unable to edit");
            }
        });

        eventbus.on("room-color", function (color) {
            component.setState({room: React.addons.update(component.state.room, {color: {$set: color}})});
        });

        eventbus.on("track-vote", function (track) {
            component.sendAddOrVote([track.id]);
        });

        eventbus.on("track-vote-id", function (trackId) {
            component.sendAddOrVote([trackId]);
        });

        eventbus.on("track-add", function (track) {
            component.sendAddOrVote([track.id]);
            component.searchSpotifyImmediately(); // search again to clear the new add from the spotify search results
        });

        eventbus.on("open-in-spotify", function (track) {
            try {
                spotifyBrowserApi.openInSpotify(track.id);
            } catch (err) {
                console.warn("No spotifyBrowserApi found!? ", err);
            }
        });

        eventbus.on("play-token-lost", function () {
            component.setState({playing: false, userPaused: true});
        });

        eventbus.on("delete-room", function (room) {
            // send delete to server and shutdown
            $.ajax({
                url: '/deleteroom?id=' + encodeURIComponent(room.id),
                dataType: 'json',
                success: function (data) {
                    component.handleRoomCloseClick();
                }.bind(this),
                error: function (xhr, status, err) {

                    // todo: display friendly error popups
                    console.error(status, err.toString());
                }.bind(this)
            });
        });

        eventbus.on("track-load-failed", function (error) {
            router.alert("Spotify is not able to play this track, usually this is because it is unavailable in your region, sorry.", "Unable to play track");
        });

        eventbus.on("star-track", function (track) {
            try {
                spotifyBrowserApi.starTrack(track.id);
            } catch (err) {
                console.warn("No spotifyBrowserApi found!? ", err);
            }
        });

        eventbus.on("playing-track-is-starred", function () {
            $('.now-playing .star-button-holder').hide();
        });

        eventbus.on("remove-track", function (track) {
            component.send({type: "remove-track", payload: track.id})
        });

        eventbus.on("preview-start", function (track) {
            component.playTrack(track.id, Math.round(track.length / 3));
        });

        eventbus.on("preview-stop", function () {
            soundbounceShared.updatePlaylist(component.state.room);
            // if there's still a track playing
            if (component.state.room.tracks.length > 0) {
                component.playTrack(component.state.room.tracks[0].id, component.state.room.currentTrackPosition);
            }
        });

        eventbus.on("click-artist", function (artistName) {
            component.setState({search: artistName});
            component.searchSpotify();
        });
    },

    componentWillUnmount: function () {

        this.pauseTrack();
        // close websocket
        if (this.socket) {
            this.socket.close(1000, "normal close");
        }

        $(window).off("resize.room");
        eventbus.off("send-chat");
        eventbus.off("update-scrollbars");
        eventbus.off("edit-room");
        eventbus.off("room-color");
        eventbus.off("track-vote");
        eventbus.off("track-vote-id");
        eventbus.off("track-add");
        eventbus.off("open-in-spotify");
        eventbus.off("play-token-lost");
        eventbus.off("delete-room");
        eventbus.off("track-load-failed");
        eventbus.off("star-track");
        eventbus.off("playing-track-is-starred");
        eventbus.off("remove-track");
        eventbus.off("preview-start");
        eventbus.off("preview-stop");
        eventbus.off("click-artist");

        clearInterval(this.intervalId);
    },

    getInitialState: function () {
        return {
            room: {tracks: []},
            playing: false,
            userPaused: false,
            showJustChat: false,
            search: '',
            spotifySearchResults: []
        };
    },

    componentDidUpdate: function (prevProps, prevState) {

        var component = this;
        $('[data-toggle="tooltip"]').tooltip();

        var prevTrackId = this.lastPlayedTrackId, newTrackId = null;

        // have we had a full sync yet(so we'd have a room name)
        if (this.state.room.name) {
            if (!this.hasSynced) {
                $.material.input();
                _.defer(function () {
                    transition($('.home-page'), $('.room-page'), 54);
                });
                this.hasSynced = true;
            }
        }

        if (this.state.room.tracks.length > 0) {
            newTrackId = this.state.room.tracks[0].id;

            if (newTrackId != prevTrackId) {

                if (!component.state.userPaused) {
                    component.setState({playing: true});

                    console.log("calling spotifyBrowserApi.playTrack for track " + newTrackId);
                    this.lastPlayedTrackId = newTrackId;
                    component.playTrack(newTrackId, this.state.room.currentTrackPosition);
                    $('.now-playing .star-button-holder').show();
                }
            }
        } else {
            // no tracks at all
            if (this.state.playing) {
                this.setState({playing: false});
            }
        }
    },

    playTrack: function (trackId, position) {
        try {
            spotifyBrowserApi.playTrack(trackId, position);
        } catch (err) {
            console.warn("No spotifyBrowserApi found!? ", err);
        }

    },

    pauseTrack: function (trackId, position) {
        try {
            spotifyBrowserApi.pauseTrack();

        } catch (err) {
            console.warn("No spotifyBrowserApi found!? ", err);
        }
    },

    tick: function () {
        var updatedRoom = this.state.room;
        var playlistUpdated = soundbounceShared.updatePlaylist(updatedRoom);

        if (playlistUpdated) {
            // only update the whole room state if the playlist changed
            this.setState({room: updatedRoom});
        }

        eventbus.trigger("track-position-update", updatedRoom.currentTrackPosition);
    },

    scrollChatToBottom: function () {
        _.defer(function () {
            var $messages = $('.messagescontainer');
            var currentScroll = $messages.scrollTop();
            //console.log("currentScroll", currentScroll);
            var height = $messages[0].scrollHeight + 200;
            $messages.scrollTop(height);
        });
    },

    send: function (data) {
        this.socket.send(JSON.stringify(data));
    },

    handleMessage: function (data) {
        if (_.isEmpty(data) || _.isEmpty(data.type))
            return;

        switch (data.type) {
            case "ping":
                this.send({type: "pong"});
                break;
            case "sync":
                // the payload is the room json
                this.handleSyncMessage(data.payload, data.user, data.now);
                break;
            case "add":
                this.handleAddMessage(data.payload);
                break;
            case "vote":
                this.handleVoteMessage(data.payload);
                break;
            case "chat":
                this.handleChatMessage(data.payload);
                break;
            case "join":
                this.handleJoinMessage(data.payload);
                break;
            case "leave":
                this.handleLeaveMessage(data.payload);
                break;
            case "announce":
                this.handleAnnounceMessage(data.payload);
                break;
        }
    },

    handleAnnounceMessage: function (message) {
        router.alert(message, "Message from Soundbounce team");
    },

    handleChatMessage: function (chatmsg) {
        var component = this;
        var updatedRoom = this.state.room;
        updatedRoom.chat.push(chatmsg);
        this.setState({room: updatedRoom});
        _.defer(function () {
            component.scrollChatToBottom();
        });
    },

    handleSyncMessage: function (room, user, now) {
        var serverTime = new Date(now);

        soundbounceShared.timeAdjust = serverTime.getTime() - (new Date()).getTime();

        console.log("ms difference from server:", soundbounceShared.timeAdjust);

        if (user) {
            this.setState({room: room, user: user});
        } else {
            this.setState({room: room});
        }

        var component = this;
        _.defer(function () {
            component.scrollChatToBottom();
        });
    },

    handleAddMessage: function (payload) {
        var component = this;
        payload.tracks.forEach(function (track) {
            soundbounceShared.addTrackToRoom(component.state.room, track, payload.user);
        });

        //console.log(this.state.room);
        this.setState({room: this.state.room});

        this.scrollChatToBottom();
    },

    handleVoteMessage: function (payload) {
        var component = this;
        var room = component.state.room;
        payload.votes.forEach(function (votemsg) {
            // trackId:track.id, moveToAfter: insertAfter, user:

            var user = votemsg.user;
            var allTrackIds = room.tracks.map(function (t) {
                return t.id;
            });
            var track = _.find(room.tracks, function (t) {
                return t.id == votemsg.trackId;
            });

            var currentIndex = _.indexOf(allTrackIds, votemsg.trackId);
            var insertIndex = _.indexOf(allTrackIds, votemsg.moveToAfter) + 1;

            if (currentIndex != insertIndex) {
                // move the track
                room.tracks = room.tracks.move(currentIndex, insertIndex);
            }

            var vote = _.clone(user);
            vote.timestamp = soundbounceShared.serverNow();

            track.votes.push(vote);

            soundbounceShared.addVoteChat(room, track, user);

        });

        this.setState({room: room});
        this.scrollChatToBottom();
    },

    handleJoinMessage: function (joiningUser) {
        var updatedListeners = _.clone(this.state.room.listeners);
        updatedListeners.push(joiningUser);
        this.setState({room: React.addons.update(this.state.room, {listeners: {$set: updatedListeners}})});
    },

    handleLeaveMessage: function (leavingUserId) {
        var updatedListeners = _.filter(this.state.room.listeners, function (l) {
            return l.id != leavingUserId;
        });
        this.setState({room: React.addons.update(this.state.room, {listeners: {$set: updatedListeners}})});
    },

    /* drag and drop from spotify */
    handleDrop: function (e) {
        if (e.preventDefault) e.preventDefault();
        var text = e.dataTransfer.getData("Text");
        // strip to just the track ids, and remove empties
        var trackIds = _.map(text.split("\r\n"), function (url) {
            return url.substr(url.lastIndexOf("/") + 1);
        }).filter(function (e) {
            return e;
        });
        // send to server
        this.sendAddOrVote(trackIds);
    },

    sendAddOrVote: function (trackIds) {
        this.send({type: "add-or-vote", payload: trackIds})
    },

    dragOver: function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    },

    handleRoomCloseClick: function (e) {
        // this.pauseTrack();
        $('.tooltip').remove();
        eventbus.trigger("update-room-list");

        router.navigate("home", {trigger: true});
    },

    onClickPlayPause: function () {
        if (this.state.userPaused) {
            // resuming
            this.tick(); // update playlists / position first

            if (this.state.room.tracks.length > 0) {
                this.playTrack(this.state.room.tracks[0].id, this.state.room.currentTrackPosition);
                this.setState({userPaused: false, playing: true});
            }
            else {
                this.setState({userPaused: false, playing: false});
            }
        }
        else {
            // pausing
            this.pauseTrack();
            this.setState({userPaused: true, playing: false});
        }
    },


    onSearchChange: function (e) {
        if (e.target.value.length > 0) {
            this.setState({search: e.target.value});
            this.searchSpotify();
        }
        else {
            this.clearSearch(e);
        }
    },

    clearSearch: function (e) {
        this.setState({search: '', spotifySearchResults: []});
    },


    searchSpotifyImmediately: function () {

        var component = this;
        if (_.isEmpty(this.state.search.trim()))
            return;
        $.ajax({
            url: 'https://api.spotify.com/v1/search?type=track&q=' + encodeURIComponent(this.state.search),
            dataType: 'json',
            success: function (data) {
                var tracks = data.tracks.items.map(function (spotifyTrack) {
                    return soundbounceShared.simpleTrack(spotifyTrack);
                });
                tracks = _.filter(tracks, function (t) {
                    return !_.contains(component.state.room.tracks.map(function (t) {
                        return t.id;
                    }), t.id);
                });
                component.setState({spotifySearchResults: tracks});
            }.bind(this),
            error: function (xhr, status, err) {
                // todo: display friendly error popups
                console.error(status, err.toString());
                router.alert("search error - " + err.toString(), "Ooops! Something went wrong...");
            }.bind(this)
        });
    },

    searchSpotify: _.debounce(function () {
        this.searchSpotifyImmediately();
    }, 200),

    handleKeyDown: function (e) {
        if (e.keyCode == 27) {
            // escape
            this.setState({search: '', spotifySearchResults: []});
        }
    },

    isCurrentUserRoomAdmin: function () {
        return _.contains(this.state.room.admins, this.state.user.id);
    },

    render: function () {
        var component = this;
        if (_.isEmpty(this.state.room)) {
            return <div id="room">
                <div></div>
            </div>;
        }
        var emptyPlaylistMessage = null;

        if (!this.state.room.name) {
            emptyPlaylistMessage = <div>Loading...</div>;
        }
        else if (this.state.room.tracks.length < 2) {
            emptyPlaylistMessage = <div>Drag and drop a few tracks from Spotify to get started. </div>;
        }

        if (_.isEmpty(this.state.room.name)) {
            return <div>
                <div className="panel panel-room-top panel-success">
                    <div className="panel-heading" style={{backgroundColor: this.props.color}}></div>
                </div>
                <br/>
                <div id="loading"></div>
            </div>;
        }

        var tracksForRoomPlaylist = _.rest(this.state.room.tracks);

        // filter local list
        if (component.state.search.length > 0) {
            tracksForRoomPlaylist = _.filter(tracksForRoomPlaylist, function (track) {
                return (track.name.toLowerCase().indexOf(component.state.search.toLowerCase()) > -1)
                    || (track.artists.map(function (a) {
                        return a.name;
                    }).join(", ").toLowerCase().indexOf(component.state.search.toLowerCase()) > -1
                    || (track.votes[0] && track.votes[0].name.toLowerCase().indexOf(component.state.search.toLowerCase()) > -1));
            });
        }


        var roomImageStyle = {};
        if (this.state.room.tracks.length > 0) {
            roomImageStyle.backgroundImage = 'url(' + this.state.room.tracks[0].img + ')'
        }

        return (
            <div id="room"onDrop={this.handleDrop} onDragOver={this.dragOver} onDragEnter={this.dragOver} onKeyDown={this.handleKeyDown}>

                <div id="roombackgroundimage" style={roomImageStyle}></div>
                <div id="roombackgroundcover" />
                <div id="nowplayingcontainer">
                    <NowPlaying
                        track={this.state.room.tracks.length > 0 ? this.state.room.tracks[0] : null}
                        position={this.state.room.currentTrackPosition}
                        color={this.state.room.color}
                        canRemove={component.isCurrentUserRoomAdmin() || (this.state.room.tracks.length > 0 ? this.state.room.tracks[0].addedBy.id == component.state.user.id : false)} />
                </div>
                <div id="playlistcontainer" className={this.state.room.tracks.length == 0 ? "no-now-playing" : ""}>
                    <div className="container-fluid">
                        <div className="playlistpadder">
                            <div className="row">
                                <div className="form-control-wrapper track-search-container">
                                    <i className="mdi-action-search" />
                                    <input type="text" className="form-control empty" placeholder="Search" onChange={this.onSearchChange} onKeyDown={this.handleKeyDown} value={this.state.search} />
                                    <i className="mdi-content-clear" onClick={this.clearSearch} style={{display: this.state.search.length > 0 ? "block" : "none"}} />
                                </div>

                                <div className="well playlist" style={{display: tracksForRoomPlaylist.length == 0 ? "none" : "block"}}>
                                       {emptyPlaylistMessage}
                                    <div className="list-group">
                                              {tracksForRoomPlaylist.map(function (track, index, arr) {
                                                  var canVote = !_.contains(track.votes.map(function (v) {
                                                      return v.id;
                                                  }), component.state.user.id);

                                                  return <PlaylistItem
                                                      track={track}
                                                      key={track.id}
                                                      color={component.state.room.color}
                                                      canVote={canVote}
                                                      canAdd={false}
                                                      canRemove={component.isCurrentUserRoomAdmin() || (track.addedBy.id == component.state.user.id)}
                                                      isLast={index == arr.length - 1}
                                                  />
                                              })}
                                    </div>
                                </div>

                                <div id="spotifyResultsContainer" style={{display: component.state.spotifySearchResults.length == 0 ? "none" : "block"}}>
                                    <p>Add new tracks to this room:</p>
                                    <div className="well playlist">

                                        <div className="list-group">
                                              {_.filter(component.state.spotifySearchResults, function (t) {
                                                  return !_.contains(component.state.room.tracks.map(function (t) {
                                                      return t.id;
                                                  }), t.id);
                                              }).map(function (track, index, arr) {

                                                  return <PlaylistItem track={track} key={track.id} color={component.state.room.color} canVote={false} canAdd={true} isLast={index == arr.length - 1}/>
                                              })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ChatPanel chat={this.state.room.chat} color={this.state.room.color} user={this.state.user} tracks={this.state.room.tracks} />

                <div className="panel panel-room-top panel-success">
                    <div className="panel-heading" style={{backgroundColor: this.state.room.color}}>
                        <div className="container-fluid">
                            <div className="row">

                                <div className="col-xs-12">
                                    <div className="play-pause-container pull-left">
                                        <a href="javascript:void(0)" onClick={this.onClickPlayPause} className={'btn btn-fab btn-success btn-pause-play ' + (this.state.playing ? 'mdi-av-pause' : 'mdi-av-play-arrow')} style={{color: this.state.room.color}}> </a>
                                    </div>
                                    <div>
                                        <h2 className="hide-overflow room-name">
                                        {this.state.room.name}

                                        </h2>
                                        <p className="hide-overflow" style={{marginLeft: '30px', lineHeight: '40px;'}}>
                                            <span className="playlist-state" data-toggle="tooltip" data-placement="bottom" title="" data-original-title={this.state.room.locked ? "Playlist is closed. <br/> You may vote up curated tracks." : "Playlist is open. <br/>Search for tracks below, or <br/>drag and drop from Spotify."}  data-html="true">
                                                <i className={'' + (this.state.room.locked ? "mdi-action-lock-outline" : "mdi-av-playlist-add")}/>
                                            </span>
                                            <span className="room-listeners " data-toggle="tooltip" data-placement="bottom" title="" data-original-title={this.state.room.listeners.map(function (l) {
                                                return l.name + '<br/>';
                                            }).join('')}  data-html="true">{this.state.room.listeners.length}
                                                <i className="mdi-social-person"/>
                                            </span>
                                            <span style={{
                                                top: '-7px',
                                                position: 'relative',
                                                maxWidth: '300px',
                                                marginRight: '10px'
                                            }}>
                                            {this.state.room.description}
                                            </span>


                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="toolbar">
                            <i className="mdi-navigation-close" id="roomClose" title="Back to room list" onClick={this.handleRoomCloseClick} data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Back to room list" data-delay="500"></i>
                        </div>
                    </div>
                </div>

            </div>

        );
    }
});