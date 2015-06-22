var isAnimating = false,
    animationEndEventNames = {
        'WebkitAnimation': 'webkitAnimationEnd',
        'OAnimation': 'oAnimationEnd',
        'msAnimation': 'MSAnimationEnd',
        'animation': 'animationend'
    },
    animationEndEventName = animationEndEventNames[Modernizr.prefixed('animation')],
    support = Modernizr.cssanimations;

var onEndAnimation = function ($outpage, $inpage) {
    $outpage.attr('class', $outpage.data('originalClassList'));
    $inpage.attr('class', $inpage.data('originalClassList') + ' pt-page-current');
    isAnimating = false;
};

var transition = function ($currPage, $nextPage, animationId) {

    // animations stopped for now until we can sort performance issues
    $currPage.removeClass('pt-page-current');
    $nextPage.addClass('pt-page-current');
    return;

    if ($currPage[0] === $nextPage[0])
        return;

    if (!$currPage.data('originalClassList'))
        $currPage.data('originalClassList', $currPage.attr('class').replace('pt-page-current', ''));

    if (!$nextPage.data('originalClassList'))
        $nextPage.data('originalClassList', $nextPage.attr('class').replace('pt-page-current', ''));

    if (isAnimating) {
        return false;
    }

    isAnimating = true;

    var outClass = '', inClass = '';
    $nextPage.addClass('pt-page-current');

    switch (animationId) {
        case 54:
            outClass = 'pt-page-rotateRoomLeftOut pt-page-ontop';
            inClass = 'pt-page-rotateRoomLeftIn';
            break;
        case 55:
            outClass = 'pt-page-rotateRoomRightOut pt-page-ontop';
            inClass = 'pt-page-rotateRoomRightIn';
            break;
    }

    var animationEnd = $.Deferred();
    animationEnd.done(onEndAnimation);

    $currPage.addClass(outClass).on(animationEndEventName, function () {
        $currPage.off(animationEndEventName);
        animationEnd.resolve($currPage, $nextPage);
    });

    $nextPage.addClass(inClass).on(animationEndEventName, function () {
        $nextPage.off(animationEndEventName);
        animationEnd.resolve($currPage, $nextPage);
    });

    if (!support) {
        onEndAnimation($currPage, $nextPage);
    }

};


$(function () {
    var roomNode = $('.room-page')[0];

    var homeNode = $('.home-page')[0];
    var modalDOMNode = $('#modal-holder')[0];
    /* router */
    var routerType = Backbone.Router.extend({
        routes: {
            "home": "home",
            "room/:roomniceurl/:color": "room"
        },

        currentRoom: null,

        home: function () {
            React.render(<HomePage/>, homeNode);
            transition($(roomNode), $(homeNode), 55);
            _.defer(function () {
                $.material.input();
            });
            ga('send', 'pageview');
        },

        room: function (id, color) {

            // prevents re-loading room before transition has ended
            if (isAnimating) {
                router.navigate("home");
                return;
            }

            if (this.currentRoomId != id) {
                this.currentRoomId = id;
                React.unmountComponentAtNode(roomNode);
                React.render(<RoomPage roomid={id} color={'#' + color}/>, roomNode);
            }
            else {
                // same room that's playing, so just animate back in
                transition($('.home-page'), $('.room-page'), 54);
            }

            ga('send', 'pageview');
        },

        alert: function (message, title) {
            if (!title)
                title = "Soundbounce";
            this.showModal(<AlertMessage message={message} title={title}/>);
        },

        confirm: function (message, title, ok, cancel) {
            this.showModal(<ConfirmMessage message={message} title={title} ok={ok} cancel={cancel}/>);
        },

        showModal: function (component) {
            React.unmountComponentAtNode(modalDOMNode);
            React.render(component, modalDOMNode);
            _.defer(function () {
                $.material.input();
            });
            $('#modal-holder .modal').modal({show: true});
        }
    });

    window.router = new routerType();

    //start router
    if (!Backbone.history.start())
        router.navigate("home", {trigger: true});

    // stop following dragged links
    $(document).on('draginit dragstart dragover dragend drag drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });


    _.defer(function () {
        $.material.init();
    });


    eventbus.on("open-url", function (url) {
        console.log("opening " + url);
        try {

            spotifyBrowserApi.openUrl(url);
        } catch (err) {
            console.warn("No spotifyBrowserApi found!? ", err);
        }
    });

    /* background image fading */
    var lastBgImageSet = 1;
    var lastImageUrl = null;
    var handleBackgroundChangedEvent = function (url) {

        if(lastImageUrl == url)
            return;

        lastImageUrl = url;
        var newBgImage = lastBgImageSet == 1 ? 2 : 1;
        $('#homebackgroundimage'+lastBgImageSet).removeClass('visible');

        $('#homebackgroundimage'+newBgImage).css({backgroundImage: "url(" + url + ")"});

        $('#homebackgroundimage'+newBgImage).addClass('visible');

        lastBgImageSet = newBgImage;
    };

    eventbus.on("update-background-image", _.debounce(handleBackgroundChangedEvent, 1000));

});


