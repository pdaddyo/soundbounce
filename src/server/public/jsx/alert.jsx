var AlertMessage = React.createClass({
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
                            <button type="button" className="close" data-dismiss="modal" aria-hidden="true">×</button>
                            <h4 className="modal-title">{this.props.title}</h4>
                        </div>
                        <div className="modal-body">
                            {this.props.message}
                        </div>
                        <div className="modal-footer">

                        </div>
                    </div>
                </div>
            </div>

        );
    }
});