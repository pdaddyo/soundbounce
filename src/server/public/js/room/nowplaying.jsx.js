var NowPlaying = React.createClass({displayName: "NowPlaying",
    componentDidMount: function () {
        var component = this;
        eventbus.on("track-position-update", function (newPosition){
            component.setState({trackPosition: newPosition});
        });
    },

    componentWillUnmount: function () {
        eventbus.off("track-position-update");
    },

    getInitialState: function () {
        return {trackPosition:0};
    },

    onClickOpenSpotify: function () {
        eventbus.trigger("open-in-spotify", this.props.track);
    },

    onClickStarTrack: function (e) {
        $('.now-playing .star-button-holder').fadeOut('slow');
        eventbus.trigger("star-track", this.props.track);
    },

    onClickVoteToSkipTrack: function (e) {
        eventbus.trigger("vote-to-skip-track", this.props.track);
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

    minSec: function(ms){
        var min = Math.floor(ms/1000/60),
            sec = Math.floor((ms/1000) % 60);

        if(sec<10)
            sec = "0"+sec;

        return min+":"+sec;
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
                                    
                                    React.createElement("a", {href: "javascript:void(0)", onClick: this.onClickRemoveTrack, className: 'btn btn-fab btn-spotify fa fa-trash', "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-original-title": "Remove track", style: {
                                        overflow: 'visible',
                                        backgroundColor: this.props.color,
                                        display:this.props.canRemove?"inline-block":"none"
                                    }, "data-delay": "{\"show\": 500, \"hide\": 0}"}), 
                                    
                                    React.createElement("a", {href: "javascript:void(0)", onClick: this.onClickOpenSpotify, className: 'btn btn-fab btn-spotify fa fa-spotify', "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-original-title": "Show in Spotify", style: {
                                        overflow: 'visible',
                                        backgroundColor: this.props.color
                                    }, "data-delay": "{\"show\": 500, \"hide\": 0}"}), 
                                    
                                    React.createElement("span", {className: "skip-button-holder"}, 
                                        React.createElement("a", {href: "javascript:void(0)", onClick: this.onClickVoteToSkipTrack, className: 'btn btn-fab btn-remove mdi-action-highlight-remove', "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-html": "true", "data-original-title": "Vote to skip track", style: {
                                            overflow: 'visible',
                                            backgroundColor: this.props.color
                                        }, "data-delay": "{\"show\": 500, \"hide\": 0}"})
                                    ), 
                                    
                                    React.createElement("span", {className: "star-button-holder"}, 
                                        React.createElement("a", {href: "javascript:void(0)", onClick: this.onClickStarTrack, className: 'btn btn-fab btn-star mdi-action-grade', "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-html": "true", "data-original-title": "Add to Starred list in Spotify", style: {
                                            overflow: 'visible',
                                            backgroundColor: this.props.color
                                        }, "data-delay": "{\"show\": 500, \"hide\": 0}"})
                                    )
                                ), 
                                React.createElement("h4", {className: "list-group-item-heading", dangerouslySetInnerHTML: {__html: this.props.track.name}}), 
                                React.createElement("p", {className: "list-group-item-text hide-overflow"}, 
                                    React.createElement(ArtistList, {artists: this.props.track.artists})
                                ), 
                                React.createElement(TrackVoteDisplay, {votes: this.props.track.votes, color: this.props.color, addedBy: this.props.track.addedBy})
                            )
                        )
                    ), 
                    React.createElement("div", {className: "bs-component"}, 
                        React.createElement("div", {className: "progress progress-striped  active", "data-toggle": "tooltip", "data-placement": "bottom", title: "", "data-original-title": this.minSec(this.props.track.length-this.state.trackPosition)+ " remaining"}, 
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
