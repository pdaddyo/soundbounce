var ChatPanel = React.createClass({

    componentDidMount: function () {

        var $messages = $('.messagescontainer');

        $messages.height($(document).height() - 136);
      //  $messages.perfectScrollbar();
        $(window).on("resize.chat", function () {
            $messages.height($(window).height() - 136);
        //    $messages.perfectScrollbar("update");
        });

        // set up dropdown
        $('.dropdown-toggle').dropdown();
    },

    componentWillUnmount: function () {
        $(window).off("resize.chat");
    },

    getInitialState: function () {
        return {showJustChat: false};
    },

    toggleChatsClick: function () {
        var current = this.state.showJustChat;
        this.setState({showJustChat: !current});

        eventbus.trigger("update-scrollbars");

    },

    handleKeyDown: function (e) {
        if (e.keyCode == 13) {

            var $chatText = $('#chatText');
            eventbus.trigger("send-chat", $chatText.val());
            $chatText.val("");
        }
    },

    clickEditRoom:function () {
       eventbus.trigger("edit-room");
    },

    render: function () {
        var index = 0;
        var component = this;
        return (
            <div className="chat-panel">
                <div className="messagescontainer">
                    <ol className="discussion">

                {_.map(this.props.chat, function (msg) {
                    var text = msg.message;
                    var icon = <i/>, albumArt = null;

                    if (msg.type == "add" || msg.type == "vote") {

                        if(component.state.showJustChat)
                            return;
                        var iconClasses = React.addons.classSet({
                            'text-success': true,
                            'pull-left': true,
                            'mdi-file-file-upload': msg.type == "vote",
                            'mdi-av-playlist-add': msg.type == "add",
                            'icon': true
                        });
                        albumArt = <img className="album-art" src={msg.track.img} />
                        text = /*(msg.type == "add" ? "Added " : "Voted for ") +*/ msg.track.name + " by " + (msg.track.artists.map(function (a) {
                            return a.name;
                        }).join(", "));
                        icon = <i className={iconClasses} style={{color:component.props.color}}></i>;
                    }

                    var classes = React.addons.classSet({
                        'message': true,
                        'info': msg.type != "chat"
                    });

                    return <li className={(component.props.user.id==msg.user.id?"self ":"other ") + msg.type}   >

                        <div className="avatar">
                            <img className="circle" src={msg.user.img} />
                        </div>
                        <div className="messages" title={msg.context?"Sent during '"+msg.context.name+"' by "+msg.context.artists[0].name:""}>
                        {albumArt} {icon}
                            <p> {text}</p>
                            <time>{msg.user.name} • <span data-toggle="tooltip" data-placement="top" title="" data-original-title={msg.context?'<img style="width:90px;height:90px;" src='+msg.context.img+' /><br/>'+msg.context.name+' by '+msg.context.artists[0].name:''} data-html="true">{moment(msg.timestamp).fromNow()}</span></time>
                        </div>
                    </li>;

                })}
                    </ol>
                </div>
                <div className="chat-input-area">
                    <input type="text" className="form-control has-success" id="chatText" placeholder="Send message to all listeners..." onKeyDown={this.handleKeyDown} maxLength="400" />
                    <div className="chat-icons">
                        <i className="chat-send mdi-communication-chat"></i>
                        <div className="dropdown">
                            <i className="settings mdi-action-settings dropdown-toggle" title="Settings" data-toggle="dropdown"></i>
                            <ul className="dropdown-menu dropup">
                                <li>
                                    <a href="javascript:void(0)" onClick={this.toggleChatsClick}>{component.state.showJustChat?"Show music and chats":"Show only chats"}</a>
                                    <a href="javascript:void(0)" onClick={this.clickEditRoom}>Edit room</a>
                                </li>

                            </ul>
                        </div>
                    </div>

                </div>
            </div>

        );

    }
});
