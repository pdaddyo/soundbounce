var NowPlaying = React.createClass({
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

    onClickRemoveTrack: function () {
        var component = this;
        router.confirm("Are you sure you want to remove '"+this.props.track.name+"'?", "Confirm remove", function () {
            eventbus.trigger("remove-track", component.props.track);
        });
    },

    onClickArtist: function (e){
        eventbus.trigger("click-artist",$(e.currentTarget).text() );
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
                                <img className="" src={this.props.track.img} alt="icon" />
                            </div>
                            <div className="row-content">
                                <div className="track-icons">
                                    <a href="javascript:void(0)" onClick={this.onClickRemoveTrack} className={'btn btn-fab btn-spotify fa fa-trash'}  data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Remove track" style={{
                                        overflow: 'visible',
                                        backgroundColor: this.props.color,
                                        display:this.props.canRemove?"inline-block":"none"
                                    }} data-delay='{"show": 500, "hide": 0}'></a>

                                    <a href="javascript:void(0)" onClick={this.onClickOpenSpotify} className={'btn btn-fab btn-spotify fa fa-spotify'}  data-toggle="tooltip" data-placement="bottom" title="" data-original-title="Show in Spotify" style={{
                                        overflow: 'visible',
                                        backgroundColor: this.props.color
                                    }} data-delay='{"show": 500, "hide": 0}'></a>
                                    <span className="star-button-holder">
                                        <a href="javascript:void(0)" onClick={this.onClickStarTrack} className={'btn btn-fab btn-star mdi-action-grade'}  data-toggle="tooltip" data-placement="bottom" title=""  data-html="true" data-original-title="Add to Starred list in Spotify" style={{
                                            overflow: 'visible',
                                            backgroundColor: this.props.color
                                        }} data-delay='{"show": 500, "hide": 0}'></a>
                                    </span>
                                </div>
                                <h4 className="list-group-item-heading" dangerouslySetInnerHTML={{__html: this.props.track.name}} />
                                <p className="list-group-item-text hide-overflow artist" onClick={this.onClickArtist} dangerouslySetInnerHTML={{
                                    __html: this.props.track.artists.map(function (a) {
                                        return a.name;
                                    }).join(", ")
                                }} />
                                <TrackVoteDisplay votes={this.props.track.votes} color={this.props.color} addedBy={this.props.track.addedBy} />
                            </div>
                        </div>
                    </div>
                    <div className="bs-component">
                        <div className="progress progress-striped  active">
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
