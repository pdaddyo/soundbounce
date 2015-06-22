RoomList = React.createClass({displayName: "RoomList",

    currentlyPreviewing: null,

    handleMouseOver: function (nowPlaying) {
        if(!nowPlaying)
            return;
        eventbus.trigger('update-background-image', nowPlaying.img);
    },

    handleMouseOut: function (e) {

    },

    getInitialState: function () {
        return {loading:null};
    },

    render: function () {
        var component = this;
        var rooms = this.props.rooms;

        return (
            React.createElement("div", {id: "roomlist"}, 

                React.createElement("div", {className: "row"}, 
                    React.createElement("div", {className: "container"}, 
                            _.map(rooms, function (room) {
                                return React.createElement("div", {className: "col-sm-6 col-md-4 col-lg-3 room-list-item-container", key: room.id}, 
                                    React.createElement("div", {className: "room-list-item", onClick: function (e) {
                                        component.setState({loading:room.id});
                                        router.navigate('room/' + room.id + '/' + room.color.substr(1, 10), {trigger: true});
                                        _.delay(function () { component.setState({loading:null});}, 1500);
                                    }, style: {backgroundColor: room.color}, onMouseEnter: component.handleMouseOver.bind(component,room.nowPlaying), onMouseLeave: component.handleMouseOut, "data-trackid": room.nowPlaying ? room.nowPlaying.id : null}, 
                                        React.createElement("div", {className: "img-holder"}, 
                                            React.createElement("img", {src: room.nowPlaying ? room.nowPlaying.img : "", style: {display: room.nowPlaying ? "block" : "none"}})
                                        ), 
                                        React.createElement("div", {className: "color-bar", style: {backgroundColor: room.color}}), 
                                        React.createElement("div", {className: "text-bg"}, 
                                            React.createElement("h2", {style: {color: room.color}}, component.state.loading==room.id?"Joining...":room.name), 

                                            React.createElement("span", {className: "desc"}, room.description), 
                                            React.createElement("div", {className: "listeners", style: {
                                                color: room.color,
                                                display: room.listeners == 0 ? 'none' : 'block'
                                            }}, 

                                                React.createElement("span", {className: "num"}, room.listeners == 0 ? "" : room.listeners, " "), 
                                                React.createElement("i", {className: room.listeners == 0 ? 'mdi-social-person-outline' : 'mdi-social-person'})
                                            )

                                        )
                                    )
                                );
                            })

                    )
                )
            )
        );
    }
});
