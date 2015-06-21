HomePage = React.createClass({displayName: "HomePage",

    downloadedRooms: [],

    componentDidMount: function () {
        var component = this;
        this.updateRoomList(false);
        this.randomBg();

        eventbus.on("update-room-list", function () {
            component.updateRoomList();
          //  component.randomBg();
        });
    },

    randomBg: function () {
        $('#homebackgroundimage1').css({backgroundImage: "url(img/backgrounds/" + (Math.floor(Math.random() * 10) + 1) + ".jpg)"});
    },

    componentWillUnmount: function () {
    },

    getInitialState: function () {
        return {rooms: [], search: "", hasLoadedFullList: false, recent: []};
    },

    componentDidUpdate: function (prevProps, prevState) {
    },

    updateRoomList: function (loadFullList) {
        var component = this;
        $.ajax({
            url: '/roomlist' + (loadFullList ? "" : "?top30=true"),  // if we've clicked "show all", grab all of them
            dataType: 'json',
            success: function (data) {
                if (loadFullList) {
                    component.setState({hasLoadedFullList: true});
                }
                component.downloadedRooms = data.rooms;
                component.downloadedRecentRooms = data.recent;
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
            this.setState({rooms: this.downloadedRooms, recent: this.downloadedRecentRooms, search: search});
        }
        else {
            if (!this.state.hasLoadedFullList) {
                this.updateRoomList(true);
            }
            this.setState({
                rooms: _.filter(component.downloadedRooms, function (r) {
                        return (r.name.toLowerCase().indexOf(search.toLowerCase()) != -1);
                    }
                ),
                recent: this.downloadedRecentRooms,
                search: search
            });
        }
    },

    onSearchChange: function (e) {
        this.setRoomList(e.target.value);
    },

    clickCreateRoom: function () {
        router.showModal(React.createElement(RoomEdit, null));
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
                }, 0);

        var moreResultsButton = React.createElement("span", null);

        if (!this.state.hasLoadedFullList) {
            moreResultsButton = React.createElement("div", {className: "col-sm-6 col-md-4 col-lg-3 ", onClick: component.clickMoreResults, 
                                     style: {cursor:'pointer',height:80}}, React.createElement("h3", {className: "list-group-item-heading"}, "More" + ' ' +
                "rooms..."));
        }

        var showRecent = this.state.recent.length>0;
        if(this.state.search) {
            showRecent = false;
        }

        return (
            React.createElement("div", {id: "homecontainer"}, 

                React.createElement("div", {className: "jumbotron", id: "homeheader"}, 
                    React.createElement("div", {className: "container"}, 
                        React.createElement("div", {className: "col-sm-8"}, 
                            React.createElement("img", {src: "img/soundbounce.png", className: "logo", onClick: this.randomBg}), React.createElement("span", null, "Rooms")
                        ), 
                        React.createElement("div", {className: "col-xs-12 col-sm-4 col-md-3 col-lg-3 pull-right"}, 
                            React.createElement("button", {className: "btn btn-primary btn-lg", class: "create-room", 
                                    onClick: this.clickCreateRoom}, "+ Create room"
                            )
                        )
                    )
                ), 
                React.createElement("div", {id: "roomlistcontainer", className: "fancy-scrollbar"}, 
                    React.createElement("div", {className: "row"}, 
                        React.createElement("div", {className: "container", id: "motd", style: {display: 'none'}}, 
                            React.createElement("div", {className: "col-sm-12  "}, 
                                React.createElement("div", {className: "well"}, 
                                    React.createElement("button", {type: "button", className: "close pull-right", "data-dismiss": "modal", 
                                            "aria-hidden": "true", onClick: this.hideMOTD}, "×"
                                    ), 
                                    React.createElement("p", null, "Welcome to Soundbounce, where music sounds better together."), 

                                    React.createElement("hr", null), 
                                    React.createElement("p", null, 
                                        "Please get involved and suggest features, report bugs and look at future plans" + ' ' +
                                        "on our", 
                                        React.createElement("a", {href: "javascript:eventbus.trigger('open-url', 'https://github.com/pdaddyo/soundbounce/issues');"}, "project" + ' ' +
                                            "page on Github"), 
                                        "."
                                    )


                                )
                            )
                        )
                    ), 

                    React.createElement("div", {className: "row ", style: {marginBottom:-40}}, 
                        React.createElement("div", {className: "container"}, 
                            React.createElement("div", {className: "col-xs-12 col-sm-4 col-lg-3 pull-right room-search-container"}, 
                                React.createElement("div", {className: "form-control-wrapper"}, 
                                    React.createElement("i", {className: "mdi-action-search"}), 
                                    React.createElement("input", {type: "text", className: "form-control empty", placeholder: "Search", 
                                           onChange: this.onSearchChange, onKeyDown: this.handleKeyDown, 
                                           value: this.state.search})
                                )
                            )
                        )
                    ), 
                    React.createElement("div", {className: "container"}, 
                        React.createElement("div", {style: {display:showRecent?"block":"none"}}, 
                            React.createElement("h3", null, "Recently visited"), 
                            React.createElement(RoomList, {rooms: _.first(this.state.recent,6)})
                        ), 
                        React.createElement("h3", null, "Browse rooms  ", React.createElement("span", {className: "home-stats"}, 
                            React.createElement("i", {className: 'mdi-social-person', 
                               style: {position: 'relative',top: 1}}), " ", totalUsers, " listeners online"
                        )), 
                        React.createElement(RoomList, {rooms: _.filter(component.state.rooms, function (room){ return _.find(component.state.recent, function (recentRoom){ return recentRoom.id==room.id;})==null; })}), 
                        moreResultsButton, 
                        React.createElement("div", {className: "col-sm-12", 
                             style: {display: (this.state.rooms.length == 0 && this.state.search.length>0)? 'block' : 'none'}}, 
                            React.createElement("h2", {className: "home-title"}, "Sorry, no rooms match '", this.state.search, "':")
                        )
                    )
                )
            )

        );
    }
});
