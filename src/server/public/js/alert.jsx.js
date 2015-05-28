var AlertMessage = React.createClass({displayName: "AlertMessage",
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
                            React.createElement("button", {type: "button", className: "close", "data-dismiss": "modal", "aria-hidden": "true"}, "×"), 
                            React.createElement("h4", {className: "modal-title"}, this.props.title)
                        ), 
                        React.createElement("div", {className: "modal-body"}, 
                            this.props.message
                        ), 
                        React.createElement("div", {className: "modal-footer"}

                        )
                    )
                )
            )

        );
    }
});