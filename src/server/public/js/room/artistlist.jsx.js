var ArtistList = React.createClass({displayName: "ArtistList",

    componentDidMount: function () {

    },

    componentWillUnmount: function () {
    },

    onClickArtist: function (e){
        eventbus.trigger("click-artist",$(e.currentTarget).text() );
    },

    render: function () {
        if (_.isEmpty(this.props.artists)) {
            return React.createElement("span", null);
        }

        var result = [];
        var component = this;
        _.each(this.props.artists, function(artist){
            result.push(React.createElement("span", {className: "artist", onClick: component.onClickArtist}, artist.name));
            result.push(", ");

        });

        // strip last comma and return
        return React.createElement("span", {className: "artists"}, _.first(result, result.length-1));

    }
});
