var NowPlaying = React.createClass({
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
            return <div/>;
        }
        return (
            <div className="now-playing">
                <div className="well">
                    <div className="list-group">
                        <div className="list-group-item">
                            <div className="row-picture">
                                <img className="" src={this.props.track.img} alt="icon"/>
                            </div>
                            <div className="row-content">
                                <div className="track-icons">
                                    <div className="track-title-icons">

                                        <span className="star-button-holder"><i className="fa fa-star" onClick={this.onClickStarTrack}></i>
                                        </span>

                                        <div className="dropdown">
                                            <i className="mdi-navigation-more-vert more-menu" data-toggle="dropdown"
                                               onClick={ this.clickDropDown }/>
                                            <ul className="dropdown-menu dropdown-left" role="menu">
                                                <li><a role="menuitem" tabindex="-1" href="#"
                                                       onClick={this.onClickOpenSpotify}><i
                                                    className="fa fa-spotify"></i> Open in Spotify</a></li>
                                                <li><a role="menuitem" tabindex="-1" href="#"
                                                       onClick={this.onClickStarTrack}>
                                                    <i className="fa fa-star"></i> Add to starred list</a></li>
                                                <li className="divider"></li>
                                                <li><a role="menuitem" tabindex="-1" href="#"
                                                       onClick={this.onClickVoteToSkipTrack}>
                                                    <i className="fa fa-thumbs-o-down"></i> Vote to skip</a></li>
                                                <li className="divider"></li>
                                                <li><a role="menuitem" tabindex="-1" href="#"
                                                       onClick={this.onClickYouTube}>
                                                    <i className="fa fa-youtube"></i> Find on YouTube</a></li>
                                                <li><a role="menuitem" tabindex="-1" href="#"
                                                       onClick={this.onClickLastFM}>
                                                    <i className="fa fa-lastfm"></i> Find on Last.fm</a></li>

                                                <li className="divider"
                                                    style={{display:this.props.canRemove?"block":"none"}}></li>
                                                <li><a role="menuitem" tabindex="-1" href="#"
                                                       onClick={this.onClickRemoveTrack}
                                                       style={{display:this.props.canRemove?"block":"none"}}><i
                                                    className="fa fa-trash"></i> Remove</a></li>

                                            </ul>
                                        </div>
                                    </div>

                                </div>
                                <h4 className="list-group-item-heading"
                                    dangerouslySetInnerHTML={{__html: this.props.track.name}}/>

                                <p className="list-group-item-text hide-overflow">
                                    <ArtistList artists={this.props.track.artists}/>
                                </p>

                                <p className={'who-added '+(this.props.track.addedBy.id==1?'soundbounce':'')}>
                                    <img src={this.props.track.addedBy.img}  data-toggle="tooltip" data-placement="bottom" title="" data-original-title={'<p class="top-line">'+('Added by')+'</p>'+
(this.props.track.addedBy.id==1?'':'<img src=' + this.props.track.addedBy.img + '/>')
+'<p>'+this.props.track.addedBy.name+'</p>'} data-html="true" data-delay='{"show": 50, "hide": 0}' />
                                </p>
                                <TrackVoteDisplay votes={this.props.track.votes} color={this.props.color}
                                                  addedBy={this.props.track.addedBy}/>
                            </div>
                        </div>
                    </div>
                    <div className="bs-component">
                        <div className="progress progress-striped  active" data-toggle="tooltip" data-placement="bottom"
                             title=""
                             data-original-title={this.minSec(this.props.track.length-this.state.trackPosition)+ " remaining"}>
                            <div className="progress-bar progress-bar-success" style={{
                                width: (this.state.trackPosition / this.props.track.length * 100) + '%',
                                backgroundColor: this.props.color
                            }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
