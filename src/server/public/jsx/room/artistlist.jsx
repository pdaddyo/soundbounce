var ArtistList = React.createClass({

    componentDidMount: function () {

    },

    componentWillUnmount: function () {
    },

    onClickArtist: function (e){
        eventbus.trigger("click-artist",$(e.currentTarget).text() );
    },

    render: function () {
        if (_.isEmpty(this.props.artists)) {
            return <span/>;
        }

        var result = [];
        var component = this;
        _.each(this.props.artists, function(artist){
            result.push(<span className="artist" onClick={component.onClickArtist}>{artist.name}</span>);
            result.push(", ");

        });

        // strip last comma and return
        return <span className="artists">{_.first(result, result.length-1)}</span>;

    }
});
