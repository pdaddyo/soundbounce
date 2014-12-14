var PlaylistItem = React.createClass({

    componentDidMount: function () {
        $('[data-toggle="tooltip"]').tooltip();

    },

    componentWillUnmount: function () {
    },

    onClickVote: function () {
  //      $('.tooltip').remove();

        var track = this.props.track;
        _.defer(function () {
            eventbus.trigger("track-vote", track);
        });
    },

    onClickAdd: function () {

        var track = this.props.track;
        _.defer(function () {
            eventbus.trigger("track-add", track);
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
            <div id={'track' + this.props.track.id} className={this.props.canAdd?"spotify-result":""}>
                <div className="list-group-item">
                    <div className="row-picture">

                        <div className="track-icons">
                            <span className="hover-hide">
                            <a href="javascript:void(0)" onClick={this.onClickOpenSpotify} className={'btn btn-fab btn-spotify fa fa-spotify'}  data-toggle="tooltip" data-placement="top" title="" data-original-title="Show in Spotify" style={{
                                overflow: 'visible',
                                backgroundColor: this.props.color
                            }} data-delay='{"show": 500, "hide": 0}'></a>
                            <a href="javascript:void(0)" onClick={this.onClickVote} className={'btn btn-fab btn-vote mdi-file-file-upload ' + (this.props.canVote ? '' : 'hide')}  data-toggle="tooltip" data-placement="top" title="" data-original-title="Vote" style={{
                                overflow: 'visible',
                                backgroundColor: this.props.color
                            }} data-delay='{"show": 500, "hide": 0}'></a>
                                </span>
                            <a href="javascript:void(0)" onClick={this.onClickAdd} className={'btn btn-fab btn-add mdi-av-playlist-add ' + (this.props.canAdd ? '' : 'hide')}  data-toggle="tooltip" data-placement="top" title="" data-original-title="Add to room" style={{
                                overflow: 'visible',
                                backgroundColor: this.props.color
                            }} data-delay='{"show": 500, "hide": 0}'></a>

                        </div>
                        <img className="circle art" src={this.props.track.img} alt="icon" />
                    </div>
                    <div className="row-content">
                        <h4 className="list-group-item-heading hide-overflow" dangerouslySetInnerHTML={{__html:this.props.track.name}} />
                        <p className="list-group-item-text" >
                            <span dangerouslySetInnerHTML={{__html:this.props.track.artists.map(function (a) {
                                return a.name;
                            }).join(", ")}} />
                                <TrackVoteDisplay votes={this.props.track.votes} color={this.props.color} />
                        </p>
                    </div>
                </div>
                <div className="list-group-separator" style={{display:this.props.isLast?"none":"block"}}></div>
            </div>

        );


    }
});
