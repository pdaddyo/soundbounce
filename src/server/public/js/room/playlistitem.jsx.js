var PlaylistItem = React.createClass({displayName: "PlaylistItem",

    isPreviewing:false,

    getInitialState: function() {
        return {

        };
    },

    componentDidMount: function () {
        $('[data-toggle="tooltip"]').tooltip();

    },

    componentWillUnmount: function () {
    },

    onClickVote: function () {
        var track = this.props.track;
        // hacky
        $('.play-list-item').removeClass('details');

        _.defer(function () {
            eventbus.trigger("track-vote", track);
        });
    },

    onClickAdd: function () {
        // hacky
        $('.play-list-item').removeClass('details');

        var track = this.props.track;
        _.defer(function () {
            eventbus.trigger("track-add", track);
        });
    },

    onClickOpenSpotify: function () {
        eventbus.trigger("open-in-spotify", this.props.track);
    },

    onClickRemoveTrack: function (e) {
        var component = this;

        if(e.ctrlKey)
        {
            eventbus.trigger("remove-track", component.props.track);
        }
        else {
            router.confirm("Are you sure you want to remove '" + this.props.track.name + "'?", "Confirm remove", function () {
                eventbus.trigger("remove-track", component.props.track);
            });
        }
    },

    onClickStarTrack: function (e) {
        eventbus.trigger("star-track", this.props.track);
    },

    onClickLastFM: function (e) {
        eventbus.trigger('open-url', 'http://www.last.fm/search?q='+escape(this.props.track.artists[0].name+' '+this.props.track.name));
    },

    onClickYouTube: function (e) {
        eventbus.trigger('open-url', 'https://www.youtube.com/results?search_query='+escape(this.props.track.artists[0].name+' '+this.props.track.name));
    },

    onClickAlbum: function (e){
        eventbus.trigger('open-url', this.state.albumUri);
    },

    toggleDetails: function (e){
        var component = this;
        if($('#track' + this.props.track.id).hasClass('details')){
            $('.play-list-item').removeClass('details');
        }
        else{
            $('.play-list-item').removeClass('details');
            $('#track' + this.props.track.id).addClass('details');

            // load track then album details from spotify API and populate...
            $.getJSON( 'https://api.spotify.com/v1/tracks/'+this.props.track.id, function( trackData ) {
                $.getJSON( 'https://api.spotify.com/v1/albums/'+trackData.album.id, function( albumData ) {
                    $('#track' + component.props.track.id + ' .track-album').html('<span>Track '+trackData.track_number+' on <span class="hov">'+trackData.album.name+'</span></span>');
                    component.setState({albumUri:albumData.uri});

                    $('#track' + component.props.track.id + ' .year-label').html("&copy; " + albumData.copyrights[0].text);
                });
            });
        }

        // todo: handle all this properly using react instead of jquery
    },

    previewStart: function () {
        this.isPreviewing = true;
        eventbus.trigger("preview-start", this.props.track);
    },

    previewStop: function () {
        if(this.isPreviewing){
            eventbus.trigger("preview-stop");
            this.isPreviewing = false;
        }
    },

    clickDropDown: function () {

        // not react-friendly but gets the menu staying visible when no longer hovering
        $('.play-list-item').removeClass('selected');
        $('#track' + this.props.track.id).addClass('selected');
        $('body').on('click.trackdropdowndismiss', function () {
            $('body').off('click.trackdropdowndismiss');
            $('.play-list-item').removeClass('selected');
        })
    },

    render: function () {
        if (this.props.track == null) {
            return React.createElement("div", null);
        }

        return (
            React.createElement("div", {id: 'track' + this.props.track.id, className: this.props.canAdd?"spotify-result play-list-item":"play-list-item", style: {display:this.props.visible?"block":"none"}, key: this.props.track.id}, 
                React.createElement("div", {className: "list-group-item"}, 
                    React.createElement("div", {className: "row-picture"}, 
                        React.createElement("img", {className: "circle art", src: this.props.track.img, alt: "icon", onMouseDown: this.previewStart, onMouseUp: this.previewStop, onMouseOut: this.previewStop, "data-toggle": "tooltip", "data-placement": "top", "data-original-title": "Click and hold to preview"})
                    ), 
                    React.createElement("div", {className: "row-content"}, 
                        React.createElement("div", {className: "track-title-container"}, 
                            React.createElement("h4", {className: "list-group-item-heading hide-overflow", dangerouslySetInnerHTML: {__html:this.props.track.name}, onClick: this.toggleDetails}), 
                            React.createElement("div", {className: "track-title-icons"}, 
                                React.createElement("i", {onClick: this.onClickAdd, className: 'mdi-av-playlist-add ' + (this.props.canAdd ? '' : 'hide'), "data-toggle": "tooltip", "data-placement": "top", title: "", "data-original-title": "Add to room", "data-delay": "{\"show\": 500, \"hide\": 0}"}), React.createElement("i", {onClick: this.onClickVote, className: 'fa fa-level-up ' + (this.props.canVote ? '' : 'hide'), "data-toggle": "tooltip", "data-placement": "top", title: "", "data-original-title": "Vote", "data-delay": "{\"show\": 500, \"hide\": 0}"}), React.createElement("div", {className: "dropdown"}, 
                                    React.createElement("i", {className: "mdi-navigation-more-vert more-menu", "data-toggle": "dropdown", onClick:  this.clickDropDown}), 
                                    React.createElement("ul", {className: "dropdown-menu dropdown-left", role: "menu"}, 
                                        React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", onClick: this.onClickOpenSpotify}, React.createElement("i", {className: "fa fa-spotify"}), " Open in Spotify")), 
                                        React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", onClick: this.onClickStarTrack}, React.createElement("i", {className: "fa fa-star"}), " Add to starred list")), 
                                        React.createElement("li", {className: "divider"}), 
                                        React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", onClick: this.onClickYouTube}, React.createElement("i", {className: "fa fa-youtube"}), " Find on YouTube")), 
                                        React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", onClick: this.onClickLastFM}, React.createElement("i", {className: "fa fa-lastfm"}), " Find on Last.fm")), 
                                        React.createElement("li", {className: "divider", style: {display:this.props.canRemove?"block":"none"}}), 
                                        React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", onClick: this.onClickRemoveTrack, style: {display:this.props.canRemove?"block":"none"}}, React.createElement("i", {className: "fa fa-trash"}), " Remove"))

                                    )
                                )
                            )
                        ), 
                        React.createElement("p", {className: "list-group-item-text"}, 

                                React.createElement(ArtistList, {artists: this.props.track.artists}), 

                                React.createElement(TrackVoteDisplay, {votes: this.props.track.votes, color: this.props.color, addedBy: this.props.track.addedBy})
                        ), 
                        React.createElement("p", {className: 'who-added '+(this.props.track.addedBy.id==1?'soundbounce':'')}, 
React.createElement("img", {src: this.props.track.addedBy.img, "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-original-title": '<p class="top-line">'+('Added by')+'</p>'+
(this.props.track.addedBy.id==1?'':'<img src=' + this.props.track.addedBy.img + '/>')
+'<p>'+this.props.track.addedBy.name+'</p>', "data-html": "true", "data-delay": "{\"show\": 50, \"hide\": 0}"})
                        ), 

                        React.createElement("div", {className: "extra-details"}, 
                            React.createElement("p", {className: "list-group-item-text track-album", onClick: this.onClickAlbum}, " "), 
                            React.createElement("p", {className: "list-group-item-text year-label"}, "Loading details...")
                        )
                    )
                )
            )

        );


    }
});
