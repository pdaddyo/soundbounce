var NowPlaying = React.createClass({displayName: "NowPlaying",
    componentDidMount: function () {
        var component = this;
        eventbus.on("track-position-update", function (newPosition) {
            component.setState({trackPosition: newPosition});
        });
    },

    componentWillUnmount: function () {
        eventbus.off("track-position-update");
    },

    getInitialState: function () {
        return {trackPosition: 0};
    },

    onClickOpenSpotify: function () {
        eventbus.trigger("open-in-spotify", this.props.track);
    },

    onClickStarTrack: function (e) {
        $('.now-playing .star-button-holder').addClass('clicked');
        eventbus.trigger("star-track", this.props.track);
    },

    onClickVoteToSkipTrack: function (e) {
        eventbus.trigger("vote-to-skip-track", this.props.track);
    },

    onClickLastFM: function (e) {
        eventbus.trigger('open-url', 'http://www.last.fm/search?q=' + escape(this.props.track.artists[0].name + ' ' + this.props.track.name));
    },

    onClickYouTube: function (e) {
        eventbus.trigger('open-url', 'https://www.youtube.com/results?search_query=' + escape(this.props.track.artists[0].name + ' ' + this.props.track.name));
    },


    onClickRemoveTrack: function (e) {
        var component = this;

        if (e.ctrlKey) {
            eventbus.trigger("remove-track", component.props.track);
        }
        else {
            router.confirm("Are you sure you want to remove '" + this.props.track.name + "'?", "Confirm remove", function () {
                eventbus.trigger("remove-track", component.props.track);
            });
        }
    },

    minSec: function (ms) {
        var min = Math.floor(ms / 1000 / 60),
            sec = Math.floor((ms / 1000) % 60);

        if (sec < 10)
            sec = "0" + sec;

        return min + ":" + sec;
    },

    render: function () {
        if (this.props.track == null) {
            return React.createElement("div", null);
        }
        return (
            React.createElement("div", {className: "now-playing"}, 
                React.createElement("div", {className: "well"}, 
                    React.createElement("div", {className: "list-group"}, 
                        React.createElement("div", {className: "list-group-item"}, 
                            React.createElement("div", {className: "row-picture"}, 
                                React.createElement("img", {className: "", src: this.props.track.img, alt: "icon"})
                            ), 
                            React.createElement("div", {className: "row-content"}, 
                                React.createElement("div", {className: "track-icons"}, 
                                    React.createElement("div", {className: "track-title-icons"}, 

                                        React.createElement("span", {className: "star-button-holder"}, React.createElement("i", {className: "fa fa-star", onClick: this.onClickStarTrack})
                                        ), 

                                        React.createElement("div", {className: "dropdown"}, 
                                            React.createElement("i", {className: "mdi-navigation-more-vert more-menu", "data-toggle": "dropdown", 
                                               onClick:  this.clickDropDown}), 
                                            React.createElement("ul", {className: "dropdown-menu dropdown-left", role: "menu"}, 
                                                React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", 
                                                       onClick: this.onClickOpenSpotify}, React.createElement("i", {
                                                    className: "fa fa-spotify"}), " Open in Spotify")), 
                                                React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", 
                                                       onClick: this.onClickStarTrack}, 
                                                    React.createElement("i", {className: "fa fa-star"}), " Add to starred list")), 
                                                React.createElement("li", {className: "divider"}), 
                                                React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", 
                                                       onClick: this.onClickVoteToSkipTrack}, 
                                                    React.createElement("i", {className: "fa fa-thumbs-o-down"}), " Vote to skip")), 
                                                React.createElement("li", {className: "divider"}), 
                                                React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", 
                                                       onClick: this.onClickYouTube}, 
                                                    React.createElement("i", {className: "fa fa-youtube"}), " Find on YouTube")), 
                                                React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", 
                                                       onClick: this.onClickLastFM}, 
                                                    React.createElement("i", {className: "fa fa-lastfm"}), " Find on Last.fm")), 

                                                React.createElement("li", {className: "divider", 
                                                    style: {display:this.props.canRemove?"block":"none"}}), 
                                                React.createElement("li", null, React.createElement("a", {role: "menuitem", tabindex: "-1", href: "#", 
                                                       onClick: this.onClickRemoveTrack, 
                                                       style: {display:this.props.canRemove?"block":"none"}}, React.createElement("i", {
                                                    className: "fa fa-trash"}), " Remove"))

                                            )
                                        )
                                    )

                                ), 
                                React.createElement("h4", {className: "list-group-item-heading", 
                                    dangerouslySetInnerHTML: {__html: this.props.track.name}}), 

                                React.createElement("p", {className: "list-group-item-text hide-overflow"}, 
                                    React.createElement(ArtistList, {artists: this.props.track.artists})
                                ), 

                                React.createElement("p", {className: 'who-added '+(this.props.track.addedBy.id==1?'soundbounce':'')}, 
                                    React.createElement("img", {src: this.props.track.addedBy.img, "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-original-title": '<p class="top-line">'+('Added by')+'</p>'+
(this.props.track.addedBy.id==1?'':'<img src=' + this.props.track.addedBy.img + '/>')
+'<p>'+this.props.track.addedBy.name+'</p>', "data-html": "true", "data-delay": "{\"show\": 50, \"hide\": 0}"})
                                ), 
                                React.createElement(TrackVoteDisplay, {votes: this.props.track.votes, color: this.props.color, 
                                                  addedBy: this.props.track.addedBy})
                            )
                        )
                    ), 
                    React.createElement("div", {className: "bs-component"}, 
                        React.createElement("div", {className: "progress progress-striped  active", "data-toggle": "tooltip", "data-placement": "bottom", 
                             title: "", 
                             "data-original-title": this.minSec(this.props.track.length-this.state.trackPosition)+ " remaining"}, 
                            React.createElement("div", {className: "progress-bar progress-bar-success", style: {
                                width: (this.state.trackPosition / this.props.track.length * 100) + '%',
                                backgroundColor: this.props.color
                            }})
                        )
                    )
                )
            )
        );
    }
});
