HomePage = React.createClass({

    downloadedRooms: [],

    componentDidMount: function () {
        var component = this;
        this.updateRoomList(false);
        this.randomBg();

        eventbus.on("update-room-list", function () {
            component.updateRoomList();
            component.randomBg();
        });
    },

    randomBg: function (){
        $('#homebackgroundimage').css({backgroundImage:"url(img/backgrounds/"+(Math.floor(Math.random()*10)+1)+".jpg)"});
    },

    componentWillUnmount: function () {
    },

    getInitialState: function () {
        return {rooms: [], search: "", hasLoadedFullList: false};
    },

    componentDidUpdate: function (prevProps, prevState) {
    },

    updateRoomList: function (loadFullList) {
        var component = this;
        $.ajax({
            url: '/roomlist' +(loadFullList ? "" : "?top30=true"),  // if we've clicked "show all", grab all of them
            dataType: 'json',
            success: function (data) {
                if(loadFullList){
                    component.setState({hasLoadedFullList: true});
                }
                component.downloadedRooms = data;
                component.setRoomList(component.state.search);
            }.bind(this),
            error: function (xhr, status, err) {
                console.error(status, err.toString());
                router.alert(err.toString(), "Ooops! Something went wrong...");
            }.bind(this)
        });
    },

    setRoomList: function (search) {
        var component = this;
        if (this.state.search == '') {
            this.setState({rooms: this.downloadedRooms, search: search});
        }
        else {
            if(!this.state.hasLoadedFullList){
                this.updateRoomList(true);
            }
            this.setState({
                rooms: _.filter(component.downloadedRooms, function (r) {
                        return (r.name.toLowerCase().indexOf(search.toLowerCase()) != -1);
                    }
                ),
                search: search
            });
        }
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
        $('#motd').slideUp();
    },

    clickMoreResults: function () {
        this.updateRoomList(true);
    },

    render: function () {

        var component = this,
            totalUsers = _.reduce(
                            this.downloadedRooms.map(function (r) {
                                return r.listeners;
                            }),
                            function (a, b) {
                                return a + b;
                            },0);

        var moreResultsButton = <span></span>;

        if(!this.state.hasLoadedFullList)
        {
            moreResultsButton = <div className="col-sm-6 col-md-4 col-lg-3 "  onClick={component.clickMoreResults} style={{cursor:'pointer',height:80}}><h3 className="list-group-item-heading">More rooms...</h3></div>;
        }

        return (
            <div id="homecontainer">
                <div id="homebackgroundimage"></div>
                <div id="homebackgroundcover"></div>
                <div className="jumbotron" id="homeheader">
                    <div className="container">
                        <div  className="col-sm-8">
                           <img src="img/soundbounce.png" className="logo" onClick={this.randomBg}/><span>Rooms</span>
                        </div>
                        <div className="col-xs-12 col-sm-4 col-md-3 col-lg-3 pull-right">
                            <button className="btn btn-primary btn-lg" class="create-room" onClick={this.clickCreateRoom}>+ Create room
                            </button>
                        </div>
                    </div>
                </div>
                <div  id="roomlistcontainer" className="fancy-scrollbar" >
                    <div className="row" >
                        <div className="container" id="motd" style={{display: 'none'}}>
                            <div  className="col-sm-12  ">
                                <div className="well">
                                    <button type="button" className="close pull-right" data-dismiss="modal" aria-hidden="true" onClick={this.hideMOTD}>×</button>
                                    <p>Welcome to Soundbounce, where music sounds better together.</p>

                                    <hr/>
                                    <p>
                                        Please get involved and suggest features, report bugs and look at future plans on our
                                        <a href="javascript:eventbus.trigger('open-url', 'https://github.com/pdaddyo/soundbounce/issues');">project page on Github</a>
                                        .
                                    </p>


                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row " style={{marginTop:10,marginBottom:10}}>
                        <div className="container">
                            <div className="col-sm-8 home-stats">
                                <i className={'mdi-social-person'} style={{position: 'relative',top: 1}}></i> {totalUsers} listeners online
                            </div>
                            <div className="col-xs-12 col-sm-4 col-lg-3 pull-right room-search-container">
                                <div className="form-control-wrapper">
                                    <i className="mdi-action-search" />
                                    <input type="text" className="form-control empty" placeholder="Search" onChange={this.onSearchChange} onKeyDown={this.handleKeyDown} value={this.state.search} />
                                </div>
                            </div>
                            <div className="col-sm-12" style={{display: this.state.rooms.length == 0 ? 'block' : 'none'}}>
                                <h2 className="home-title" >Sorry, no rooms match '{this.state.search}':</h2>
                            </div>
                        </div>
                    </div>
                    <div className="container">
                        <RoomList rooms={this.state.rooms} />
                        {moreResultsButton}
                    </div>
                </div>
            </div>

        );
    }
});
