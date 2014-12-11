var WebSocketServer = require('ws').Server
    , http = require('http')
    , express = require('express')
    , app = express()
    , config = require('./config')
    , passport = require('passport')
    , FacebookStrategy = require('passport-facebook').Strategy
    , TwitterStrategy = require('passport-twitter').Strategy
    , soundbounce = require('./soundbounce-server')
    , fs = require('fs')
    , session = require('express-session')
    , fileSessionStore = require('./session-store')(session)

    , _ = require('underscore');


// setup session
var sessionHandler = session({
    secret: config.session.secret,
    cookie: {
        maxAge: config.session.timeout
    },
    rolling: true,
    saveUninitialized: true,
    resave: true,
    store: new fileSessionStore
});


// set up express app + http server
app.use(express.static(__dirname + '/public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(sessionHandler);


var server = http.createServer(app);
server.listen(config.server.port);


// setup passport for facebook +twitter auth
passport.use(new FacebookStrategy({
        clientID: config.facebook.clientID,
        clientSecret: config.facebook.clientSecret,
        callbackURL: config.siteRoot + config.facebook.callbackURL
    },
    function (accessToken, refreshToken, profile, done) {
        console.log("facebook auth granted by ", profile.displayName);
        done(null, {
            type: "facebook",
            id: "facebook-" + profile.id,
            img: 'https://graph.facebook.com/' + profile.id + '/picture',
            name: profile.displayName
        });
    }
));

passport.use(new TwitterStrategy({
        consumerKey: config.twitter.consumerKey,
        consumerSecret: config.twitter.consumerSecret,
        callbackURL: config.siteRoot + config.twitter.callbackURL
    },
    function (token, tokenSecret, profile, done) {
        console.log("twitter auth granted by ", profile.displayName);
        done(null, {
            type: "twitter",
            id: "twitter-" + profile.id,
            img: profile.photos[0].value,
            name: profile.displayName
        });
    }
));

passport.serializeUser(function (req, user, done) {
    console.log( req.session.user.spotifyUsername + " auth'd social - user: ", user);

    // find user
    var soundbounceUser = _.find(soundbounce.users, function (u) { return u.id == req.session.user.id;});

    soundbounceUser.social = user.type;
    soundbounceUser.img = user.img;
    soundbounceUser.name = user.name;

    req.session.user = soundbounceUser;

    done(null, user);
});

passport.deserializeUser(function (user, req, done) {
    done(null, user);
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect: '/app.html',
        failureRedirect: '/social-error' //todo: social error page
    }));

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
        successRedirect: '/app.html',
        failureRedirect: '/social-error'
    }));


// initialise soundbounce
soundbounce.init(app, server,sessionHandler);


// handle termination gracefully
process.on('SIGINT', function () {
    soundbounce.shutdown();
    process.exit();
});



