var ConfirmMessage = React.createClass({
    componentDidMount: function () {

    },

    componentWillUnmount: function () {

    },

    render: function () {
        return (
            <div className="modal fade edit-room" >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" data-dismiss="modal" aria-hidden="true" onClick={this.props.cancel}>×</button>
                            <h4 className="modal-title">{this.props.title}</h4>
                        </div>
                        <div className="modal-body">
                            <p>{this.props.message}</p>
                                <div className="col-sm-12" >
                                    <button type="submit" className="btn btn-primary pull-right" data-dismiss="modal" onClick={this.props.ok}>OK</button>
                                    <button type="button" className="btn btn-default pull-right" data-dismiss="modal" onClick={this.props.cancel}>Cancel</button>
                                </div>

                        </div>
                        <div className="modal-footer">

                        </div>
                    </div>
                </div>
            </div>

        );
    }
});