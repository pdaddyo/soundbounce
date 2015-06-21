var RoomEdit = React.createClass({

    componentDidMount: function () {
        _.delay(function () {
            $('#roomName').focus();
        }, 300);

        if (this.props.room) {
            this.setState({room: this.props.room});
        }
        var component = this;

        _.defer(function () {
            $('.edit-room select').simplecolorpicker({picker: true}).simplecolorpicker('selectColor', component.state.room.color).on('change', function () {
                var color = $('.edit-room select').val();
                component.setState({room: React.addons.update(component.state.room, {color: {$set: color}})});
                //   alert(color)
                eventbus.trigger("room-color", color);
            });
        });

    },

    componentWillUnmount: function () {

    },

    getInitialState: function () {
        return {
            showAdvanced: false,
            room: {id: null, name: '', description: '', topUpURI: '', color: '#01579b'}
        };
    },

    componentDidUpdate: function (prevProps, prevState) {

    },

    handleFormSubmit: function (e) {
        e.preventDefault();

        var color = $('#roomColor').val();

        if (roomName == "")
            return;

        var component = this;

        $.ajax({
            url: '/editroom?id=' + encodeURIComponent(component.state.room.id)
            + '&name=' + encodeURIComponent(component.state.room.name)
            + "&description=" + encodeURIComponent(component.state.room.description)
            + "&uri=" + encodeURIComponent(component.state.room.topUpURI)
            + "&color=" + encodeURIComponent(component.state.room.color)
            ,
            dataType: 'json',
            success: function (data) {
                router.navigate("room/" + data.id + "/" + component.state.room.color.substr(1, 10), {trigger: true});
                $('#modal-holder .modal').modal('hide');
            }.bind(this),
            error: function (xhr, status, err) {
                router.alert(status + " " + err.toString(),"Ooops! Something went wrong...");
                console.error(status, err.toString());
            }.bind(this)
        });
    },

    onChangeName: function (e) {
        this.setState(React.addons.update(this.state, {room: {name: {$set: e.target.value.substr(0, 60)}}}));
    },

    onChangeURI: function (e) {
        this.setState(React.addons.update(this.state, {room: {topUpURI: {$set: e.target.value}}}));
    },

    onChangeDescription: function (e) {
        this.setState(React.addons.update(this.state, {room: {description: {$set: e.target.value.substr(0, 140)}}}));
    },

    onClickShowAdvanced: function (e) {
        this.setState({showAdvanced: true});
        _.defer(function () {
            $('#topUpURI').focus();
        });
    },

    onClickDelete: function() {
        if(confirm('Are you sure you want to delete this room?')) {
            eventbus.trigger("delete-room", this.state.room);
        }
    },

    render: function () {
        return (
            <div className="modal fade edit-room" >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" data-dismiss="modal" aria-hidden="true">×</button>
                            <h4 className="modal-title">{this.state.room.id == null ? "Create a new room" : "Edit " + this.state.room.name}</h4>
                        </div>
                        <div className="modal-body">
                            <form className="form-horizontal" onSubmit={this.handleFormSubmit}>
                                <div className="form-group">
                                    <div className="col-sm-12">
                                        <input type="text" className="form-control floating-label" id="roomName" placeholder="Name" value={this.state.room.name} onChange={this.onChangeName} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <div className="col-sm-12">
                                        <input type="text" className="form-control floating-label" id="roomDesc" placeholder="Short description" value={this.state.room.description} onChange={this.onChangeDescription}/>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <div className="col-sm-12 color-row" style={{color: '#999'}} >
                                    Choose colour:&nbsp;
                                        <select id="roomColor">
                                            {_.map(window.palette, function (hex) {
                                                return <option value={'#' + hex}>  </option>
                                            })};

                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{display: this.state.showAdvanced ? "none" : "block"}}>
                                    <div className="col-sm-12" >
                                        <a href="javascript:void(0)" onClick={this.onClickShowAdvanced} style={{display: this.state.showAdvanced ? "none" : "block"}}>Show advanced settings...</a>

                                    </div>
                                </div>

                                <div className="form-group" style={{display: this.state.showAdvanced ? "block" : "none"}}>
                                    <div className="col-sm-12" >

                                        <h4>Auto top-up</h4>
                                        <p>Automatically top up this room with tracks from a playlist (use "Copy Spotify URI" on a public playlist in Spotify, suggested minimum 100 tracks) :</p>

                                        <input type="text" className="form-control" id="topUpURI" placeholder="Spotify URI e.g. spotify:user:1118412559:playlist:41Uf61JyNjhkETfVqI3Jjm" value={this.state.room.topUpURI} onChange={this.onChangeURI}/>

                                    </div>
                                </div>

                                <div className="form-group" style={{display: this.state.showAdvanced ? "block" : "none"}}>
                                    <div className="col-sm-12" style={{display: this.state.room.id == null ? "none" : "block"}} >
                                        <h4>Permanently delete room</h4>
                                        <button type="button" onClick={this.onClickDelete} className="btn btn-warning" data-dismiss="modal">Delete room</button>
                                    </div>
                                </div>


                                <div className="alert alert-dismissable alert-info" style={{display: this.state.room.id != null ? "none" : "block"}} >

                                    <strong>Heads up!</strong> Currently, all rooms are publicly visible.  Private rooms coming soon...
                                </div>
                                <div className="" >
                                    <div className="col-sm-12" >

                                        <button type="submit" className="btn btn-primary pull-right">{this.state.room.id == null ? "Create " : "Save "} Room</button>
                                        <button type="button" className="btn btn-default pull-right" data-dismiss="modal">Cancel</button>
                                    </div>

                                </div>

                            </form>
                        </div>
                        <div className="modal-footer">

                        </div>
                    </div>
                </div>
            </div>

        );
    }
});