var ConfirmMessage = React.createClass({displayName: "ConfirmMessage",
    componentDidMount: function () {

    },

    componentWillUnmount: function () {

    },

    render: function () {
        return (
            React.createElement("div", {className: "modal fade edit-room"}, 
                React.createElement("div", {className: "modal-dialog"}, 
                    React.createElement("div", {className: "modal-content"}, 
                        React.createElement("div", {className: "modal-header"}, 
                            React.createElement("button", {type: "button", className: "close", "data-dismiss": "modal", "aria-hidden": "true", onClick: this.props.cancel}, "×"), 
                            React.createElement("h4", {className: "modal-title"}, this.props.title)
                        ), 
                        React.createElement("div", {className: "modal-body"}, 
                            React.createElement("p", null, this.props.message), 
                                React.createElement("div", {className: "col-sm-12"}, 
                                    React.createElement("button", {type: "submit", className: "btn btn-primary pull-right", "data-dismiss": "modal", onClick: this.props.ok}, "OK"), 
                                    React.createElement("button", {type: "button", className: "btn btn-default pull-right", "data-dismiss": "modal", onClick: this.props.cancel}, "Cancel")
                                )

                        ), 
                        React.createElement("div", {className: "modal-footer"}

                        )
                    )
                )
            )

        );
    }
});