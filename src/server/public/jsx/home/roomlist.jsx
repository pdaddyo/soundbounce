RoomList = React.createClass({

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
            <div id="roomlist">

                <div className="row">
                    <div className="container">
                            {_.map(rooms, function (room) {
                                return <div className="col-sm-6 col-md-4 col-lg-3 room-list-item-container" key={room.id}>
                                    <div className="room-list-item" onClick={function (e) {
                                        component.setState({loading:room.id});
                                        router.navigate('room/' + room.id + '/' + room.color.substr(1, 10), {trigger: true});
                                        _.delay(function () { component.setState({loading:null});}, 1500);
                                    }} style={{backgroundColor: room.color}} onMouseEnter={component.handleMouseOver.bind(component,room.nowPlaying)} onMouseLeave={component.handleMouseOut} data-trackid={room.nowPlaying ? room.nowPlaying.id : null} >
                                        <div className="img-holder">
                                            <img src={room.nowPlaying ? room.nowPlaying.img : ""} style={{display: room.nowPlaying ? "block" : "none"}} />
                                        </div>
                                        <div className="color-bar" style={{backgroundColor: room.color}}></div>
                                        <div className="text-bg">
                                            <h2 style={{color: room.color}}>{component.state.loading==room.id?"Joining...":room.name}</h2>

                                            <span className="desc">{room.description}</span>
                                            <div className="listeners" style={{
                                                color: room.color,
                                                display: room.listeners == 0 ? 'none' : 'block'
                                            }}>

                                                <span className="num">{room.listeners == 0 ? "" : room.listeners} </span>
                                                <i className={room.listeners == 0 ? 'mdi-social-person-outline' : 'mdi-social-person'}></i>
                                            </div>

                                        </div>
                                    </div>
                                </div>;
                            })}

                    </div>
                </div>
            </div>
        );
    }
});
