HomePage = React.createClass({

    allRooms: [],

    componentDidMount: function () {

        this.updateRoomList();

        $(window).on("resize.home", this.updateRoomListHeight);
        $('#roomlistcontainer').perfectScrollbar();
        this.updateRoomListHeight();

        eventbus.on("update-room-list", this.updateRoomList);
    },

    componentWillUnmount: function () {
        $(window).off("resize.home");
    },

    getInitialState: function () {
        return {rooms: [], search: ""};
    },

    componentDidUpdate: function (prevProps, prevState) {
        //this.updateRoomListHeight();
    },

    updateScrollbars: function () {
        var $roomlistcontainer = $('#roomlistcontainer');
        $roomlistcontainer.perfectScrollbar('update');
    },

    updateRoomListHeight: function () {
        var $roomlistcontainer = $('#roomlistcontainer');
        $roomlistcontainer.height($(window).height() - $roomlistcontainer.position().top - 5);
    },

    updateRoomList: function () {
        var component = this;
        $.ajax({
            url: '/roomlist',
            dataType: 'json',
            success: function (data) {
                component.allRooms = data;
                component.setRoomList(component.state.search);
            }.bind(this),
            error: function (xhr, status, err) {

                // todo: display friendly error popups
                console.error(status, err.toString());
                alert(err.toString());
            }.bind(this)
        });
    },

    setRoomList: function (search) {
        var component = this;
        if (this.state.search == '') {
            this.setState({rooms: this.allRooms, search: search});
        }
        else {
            this.setState({
                rooms: _.filter(component.allRooms, function (r) {
                        return (r.name.toLowerCase().indexOf(search.toLowerCase()) != -1);
                    }
                ),
                search: search
            });
        }

        this.updateScrollbars();
    },

    onSearchChange: function (e) {
        this.setRoomList(e.target.value);
    },

    clickCreateRoom: function () {
        router.showModal(<RoomEdit />);
    },

    handleKeyDown: function (e) {
        if (e.keyCode == 27) {
            // escape
            this.setRoomList('');
        }
    },

    hideMOTD: function () {

        $('#motd').hide();
        this.updateRoomListHeight();
        this.updateScrollbars();

    },

    render: function () {
        return (
            <div>
                <div className="jumbotron">
                    <div className="container">
                        <div  className="col-sm-8  ">
                            <h1>Soundbounce
                                <i className="mdi-action-trending-up text-success"></i>
                            </h1>
                        </div>
                        <div className="col-xs-12 col-sm-4 col-lg-3 pull-right">
                            <button className="btn btn-primary btn-lg" style={{
                                width: '100%',
                                marginTop: '42px'
                            }} onClick={this.clickCreateRoom}>+ Create room
                            </button>

                        </div>
                    </div>
                </div>

                <div className="container" id="motd">
                    <div className="row" >
                        <div  className="col-sm-12  ">
                            <div className="well">
                                <button type="button" className="close pull-right" data-dismiss="modal" aria-hidden="true" onClick={this.hideMOTD}>×</button>
                                <i className="mdi-av-play-circle-outline" style={{
                                    fontSize: '110px',
                                    float: 'left',
                                    marginRight: '16px',
                                    color: '#333',
                                    textShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)'
                                }} onClick={this.hideMOTD}/>
                                <p>Welcome to Soundbounce, where music sounds better together.</p>

                                <p>
                                Click on a room below to start listening and contributing, or create your own room. Feedback welcome:&nbsp;
                                    <a href="http://twitter.com/pdaddyo" target="_blank">@pdaddyo</a>
                                </p>
                                <p>
                                    <strong>
                                    This is a work in progress and I'm ironing out the kinks.  Changes may be lost, rooms may disappear and things may go bang in the night.</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div  id="roomlistcontainer" >
                    <div className="row ">
                        <div className="container">
                            <div className="col-sm-8">
                                <h2 className="home-title" style={{display: this.state.rooms.length == 0 ? 'block' : 'none'}}>Sorry, no rooms match '{this.state.search}':</h2>
                            </div>
                            <div className="col-xs-12 col-sm-4 col-lg-3 pull-right room-search-container">
                                <div className="form-control-wrapper">
                                    <i className="mdi-action-search" />
                                    <input type="text" className="form-control empty" placeholder="Search" onChange={this.onSearchChange} onKeyDown={this.handleKeyDown} value={this.state.search} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="container">
                        <RoomList rooms={this.state.rooms} />
                    </div>
                </div>
            </div>

        );
    }
});
