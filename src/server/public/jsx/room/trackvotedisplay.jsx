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

                                        var useOutline = true;// index>0 || vote.id!=component.props.addedBy.id;

                                        var iconClasses = React.addons.classSet({
                                            //'mdi-social-person-outline':useOutline,
                                            'mdi-social-person':true,//!useOutline,
                                            'text-success':true,
                                            'pull-right':true
                                        });
                                        index++;

                                        // only show first 5 votes
                                        if(index==6){
                                            return  <span style={{color:component.props.color, top: '-3px',position: 'relative',display: 'inline-block'}}
                                                data-toggle="tooltip" data-placement="bottom" title="" data-original-title={component.props.votes.length+' votes'}>+</span>;
                                        }

                                        if(index>6){
                                            return <span></span>;
                                        }

                                        return (
                                        <span key={vote.id} className="pull-right" data-toggle="tooltip" data-placement="bottom" title="" data-original-title={'<p class="top-line">'+(useOutline?'Vote from':'Added by')+'</p><img src=' + vote.img + '/><p>'+vote.name+'</p>'} data-html="true" data-delay='{"show": 50, "hide": 0}' >
                                                <i className={iconClasses} style={{color:component.props.color}}></i>

                                            </span>);

                                    })}


            </span>
        );


    }
});
