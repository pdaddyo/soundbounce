var TrackVoteDisplay = React.createClass({

    componentDidMount: function () {

    },

    componentWillUnmount: function () {
    },

    render: function () {
        if (_.isEmpty(this.props.votes)) {
            return <span/>;
        }

        var index=0, component = this;
        return (

            <span className="votes">
                                    {this.props.votes.map(function (vote) {
                                        var iconClasses = React.addons.classSet({
                                            'mdi-social-person-outline':index>0,
                                            'mdi-social-person':index==0,
                                            'text-success':true,
                                            'pull-right':true
                                        });
                                        index++;

                                        // only show first 4 votes for now
                                        if(index==5){
                                            return  "+";
                                        }

                                        if(index>5){
                                            return <span></span>;
                                        }

                                        return (
                                            <span key={vote.id} className="pull-right" data-toggle="tooltip" data-placement="bottom" title="" data-original-title={'<img src=' + vote.img + '/><p>'+vote.name+'</p>'} data-html="true" data-delay='{"show": 10, "hide": 0}' >
                                                <i className={iconClasses} style={{color:component.props.color}}></i>

                                            </span>);

                                    })}


            </span>
        );


    }
});
