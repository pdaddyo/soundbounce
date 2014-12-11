var PlaylistItem = React.createClass({

    componentDidMount: function () {
        $('[data-toggle="tooltip"]').tooltip();

    },

    componentWillUnmount: function () {
    },

    onClickVote: function () {
        //   $('#track'+this.props.track.id).fadeOut();

        // remove tooltips from DOM to prevent react error
        $('.tooltip').remove();

        var track = this.props.track;
        _.defer(function () {
            eventbus.trigger("track-vote", track);
        });
    },

    onClickOpenSpotify: function () {
        eventbus.trigger("open-in-spotify", this.props.track);
        //  document.location = 'spotify:track:'+this.props.track.id;

    },

    render: function () {
        if (this.props.track == null) {
            return <div/>;
        }


        return (
            <div id={'track' + this.props.track.id}>
                <div className="list-group-item">
                    <div className="row-picture">

                        <div className="track-icons">
                            <a href="javascript:void(0)" onClick={this.onClickOpenSpotify} className={'btn btn-fab btn-spotify mdi-action-launch'}  data-toggle="tooltip" data-placement="top" title="" data-original-title="Show in Spotify" style={{
                                overflow: 'visible',
                                backgroundColor: this.props.color
                            }} data-delay='{"show": 500, "hide": 0}'></a>
                            <a href="javascript:void(0)" onClick={this.onClickVote} className={'btn btn-fab btn-vote mdi-file-file-upload ' + (this.props.canVote ? '' : 'hide')}  data-toggle="tooltip" data-placement="top" title="" data-original-title="Vote" style={{
                                overflow: 'visible',
                                backgroundColor: this.props.color
                            }} data-delay='{"show": 500, "hide": 0}'></a>
                        </div>
                        <img className="circle art" src={this.props.track.img} alt="icon" />
                    </div>
                    <div className="row-content">
                        <h4 className="list-group-item-heading hide-overflow">{this.props.track.name}</h4>
                        <p className="list-group-item-text">{this.props.track.artists.map(function (a) {
                            return a.name;
                        }).join(", ")}
                            <TrackVoteDisplay votes={this.props.track.votes} color={this.props.color} />
                        </p>
                    </div>
                </div>
                <div className="list-group-separator"></div>
            </div>

        );


    }
});
