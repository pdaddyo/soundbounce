RoomList = React.createClass({

    currentlyPreviewing: null,

    handleMouseOver: function (e) {
        /*
         play preview track on hover

         var trackid = $(e.currentTarget).data('trackid');

         if(trackid==null || this.currentlyPreviewing==trackid)
         return;

         e.stopPropagation();

         this.currentlyPreviewing = trackid;
         if (!_.isEmpty(trackid)) {
         try {
         spotifyBrowserApi.playTrack(trackid, 1000 * 75);
         } catch (err) {
         console.warn("No spotifyBrowserApi found!? ", err);
         }
         }*/
    },

    handleMouseOut: function (e) {
        /*    console.log('out');
         this.currentlyPreviewing = null;
         e.stopPropagation();
         try {
         spotifyBrowserApi.pauseTrack();
         } catch (err) {
         console.warn("No spotifyBrowserApi found!? ", err);
         }*/
    },

    getInitialState: function () {
        return {loading:null};
    },

    render: function () {
        var component = this;
        var rooms = _(this.props.rooms).chain().sortBy( function (r) {
            return -r.visits;
        }).sortBy( function(r){
            return -r.listeners;
        }).value();

        return (
            <div id="roomlist">

                <div className="row">
                    <div className="container">
                            {_.map(rooms, function (room) {
                                return <div className="col-sm-6 col-md-4 col-lg-3 " key={room.id}>
                                    <div className="room-list-item" onClick={function (e) {
                                        component.setState({loading:room.id});
                                        router.navigate('room/' + room.id + '/' + room.color.substr(1, 10), {trigger: true});
                                        _.delay(function () { component.setState({loading:null});}, 1500);
                                    }} style={{backgroundColor: room.color}} onMouseEnter={component.handleMouseOver} onMouseLeave={component.handleMouseOut} data-trackid={room.nowPlaying ? room.nowPlaying.id : null} >
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
