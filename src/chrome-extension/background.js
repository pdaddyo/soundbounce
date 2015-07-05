var alertError = function (tab) {
    chrome.tabs.executeScript(tab.id,
        {code: "alert('Please log into the spotify player at play.spotify.com first, then try again from the spotify tab...');"});
}

var spotifyTab = null;
var spotifyUsername = null;

var eventId = ((new Date()).getTime());

var findSpotifyTab = function (callback) {
    chrome.tabs.query(null, function (tabs) {
        for (var arrIndex = 0; arrIndex < tabs.length; arrIndex++) {
            var tab = tabs[arrIndex];
            if (tab.url.indexOf("https://play.spotify.com/") == 0 || tab.url.indexOf("https://player.spotify.com/") == 0) {
                console.log("found spotify tab - " + tab.url);
                spotifyTab = tab;
                callback(tab);
                return;
            }
        }
        callback(null);
    });
};


chrome.browserAction.onClicked.addListener(function (tab) {

    console.log("click soundbounce");

    // only inject into spotify
    if (tab.url.indexOf("https://play.spotify.com/") != 0 && tab.url.indexOf("https://player.spotify.com/") != 0) {
        alertError(tab);
    }

    // do nothing on soundbounce itself
    if (tab.url.indexOf("http://app.soundbounce.org") == 0) {
        return;
    }

    spotifyTab = tab;


    var cr = 'var CryptoJS=CryptoJS||function(h,s){var f={},t=f.lib={},g=function(){},j=t.Base={extend:function(a){g.prototype=this;var c=new g;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},            q=t.WordArray=j.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||u).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<                32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=j.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new q.init(c,a)}}),v=f.enc={},u=v.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,                    2),16)<<24-4*(b%8);return new q.init(d,c/2)}},k=v.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new q.init(d,c)}},l=v.Utf8={stringify:function(a){try{return decodeURIComponent(escape(k.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return k.parse(unescape(encodeURIComponent(a)))}},            x=t.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=new q.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=l.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var m=0;m<a;m+=e)this._doProcessBlock(d,m);m=d.splice(0,a);c.sigBytes-=b}return new q.init(m,b)},clone:function(){var a=j.clone.call(this);                a._data=this._data.clone();return a},_minBufferSize:0});t.Hasher=x.extend({cfg:j.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){x.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new w.HMAC.init(a,            d)).finalize(c)}}});var w=f.algo={};return f}(Math);    (function(h){for(var s=CryptoJS,f=s.lib,t=f.WordArray,g=f.Hasher,f=s.algo,j=[],q=[],v=function(a){return 4294967296*(a-(a|0))|0},u=2,k=0;64>k;){var l;a:{l=u;for(var x=h.sqrt(l),w=2;w<=x;w++)if(!(l%w)){l=!1;break a}l=!0}l&&(8>k&&(j[k]=v(h.pow(u,0.5))),q[k]=v(h.pow(u,1/3)),k++);u++}var a=[],f=f.SHA256=g.extend({_doReset:function(){this._hash=new t.init(j.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],m=b[2],h=b[3],p=b[4],j=b[5],k=b[6],l=b[7],n=0;64>n;n++){if(16>n)a[n]=        c[d+n]|0;else{var r=a[n-15],g=a[n-2];a[n]=((r<<25|r>>>7)^(r<<14|r>>>18)^r>>>3)+a[n-7]+((g<<15|g>>>17)^(g<<13|g>>>19)^g>>>10)+a[n-16]}r=l+((p<<26|p>>>6)^(p<<21|p>>>11)^(p<<7|p>>>25))+(p&j^~p&k)+q[n]+a[n];g=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&m^f&m);l=k;k=j;j=p;p=h+r|0;h=m;m=f;f=e;e=r+g|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+m|0;b[3]=b[3]+h|0;b[4]=b[4]+p|0;b[5]=b[5]+j|0;b[6]=b[6]+k|0;b[7]=b[7]+l|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;        d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=g.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=g._createHelper(f);s.HmacSHA256=g._createHmacHelper(f)})(Math); var hsh = CryptoJS.SHA256;';

    // log into soundbounce
    chrome.tabs.executeScript(tab.id,
        //  {code: cr + "var usernameToken = ',\"username\":\"';   for(var scriptId in document.getElementsByTagName('script')) {   var scriptEl = document.getElementsByTagName('script')[scriptId];    var js = scriptEl.text;   if(!js)continue; if(js.indexOf('new Spotify.Web.Login')>-1 && js.indexOf(usernameToken)>-1) {	var username = js.substr(js.indexOf(usernameToken)+usernameToken.length ); 	username = username.substr(0,username.indexOf('\"')); 	console.log(username); window.open('http://app.soundbounce.org/spotify-login/'+username + '?secret=' + hsh(username + 'hirdTurn42'+'+'+'pa$tCover39=latBlade62') + '&version=ChromeExtension0.1', 'soundbounce');}}"});

        {code: cr + "var username=null; for(var key in localStorage){ if(key.indexOf('notifications-')==0) username = (key.substr('notifications-'.length));}	console.log(username); if(!username){var usernameToken = ',\"username\":\"';   for(var scriptId in document.getElementsByTagName('script')) {   var scriptEl = document.getElementsByTagName('script')[scriptId];    var js = scriptEl.text;   if(!js)continue; if(js.indexOf('new Spotify.Web.Login')>-1 && js.indexOf(usernameToken)>-1) {	var username = js.substr(js.indexOf(usernameToken)+usernameToken.length ); 	username = username.substr(0,username.indexOf('\"')); }}} if(!username){alert('Error: failed to find spotify user...try clicking your notifications (bell) icon bottom left and try again...'); }else{ window.open('http://app.soundbounce.org/spotify-login/'+username + '?secret=' + hsh(username + 'hirdTurn42'+'+'+'pa$tCover39=latBlade62') + '&version=ChromeExtension0.1', 'soundbounce');  chrome.runtime.sendMessage('apbdfongpgacifbamjfogfncjjhkaeih', {action: 'username', username:username}); }"});

});

var tryFindSpotifyTab = function () {
    // todo - search tabs for spotify player

};

var executeOnSpotifyPlayer = function (code) {
    if (spotifyTab == null) {
        tryFindSpotifyTab();
    }
    if (spotifyTab == null) {
        alert("Can't find spotify player tab...?");
    }

    chrome.tabs.executeScript(spotifyTab.id, {
        code: "(function () {  var playerFrame = document.getElementById('app-player');  if(!playerFrame){ playerFrame = document.getElementById('main'); }  if(!playerFrame){ alert('Unable to find player?'); return; } "
        + " playerFrame.contentWindow.window.eval('" + code.replace('\'', '\\\'') + "');  }());"
    });
};

var nextEventId = function () {
    return ++eventId;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("background.js got a message")
    console.log(request);
    console.log(sender);

    if (request.action == "username") {
        // need to save the username for starring requests later
        console.log("username from spotify: " + request.username);
        spotifyUsername = request.username;
    }
});


// listen for commands from soundbounce website
chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
    console.log("background.js got an external message")
    console.log(request);
    console.log(sender);

    if (request.action == "play") {

        var trackId = request.trackId;
        var evalString = 'window.top.postMessage(JSON.stringify({"type":"cosmos-request","resolver":1,"id":"cosmos_' + nextEventId() + '","name":"cosmos_request_create",      "payload":{"action":"POST","uri":"sp://player/v1/main","headers":{},                "body":JSON.stringify({"action":"play","context":"spotify:track:' + trackId + '","tracks":["spotify:track:' + trackId + '"],                    "options":{"repeat":false,"shuffle":false,"can_repeat":true,"can_shuffle":true,"can_skip_prev":true,"can_skip_next":true,"can_seek":true,"use_dmca_rules":false},                    "play_origin":{"source":"unknown","reason":"playbtn","referrer":"spotify:app:now-playing-recs","referrer_version":"2.2.2","referrer_vendor":"com.spotify"}})}}), "*")';
        executeOnSpotifyPlayer(evalString);

        // seek if needed
        if (request.position > 3000) {
            setTimeout(function () {
                var seekString = 'window.top.postMessage(JSON.stringify({"type":"bridge_request","id":' + nextEventId() + ',"name":"player_seek","args":["main", ' + (Math.floor(request.position)) + '],"appVendor":"com.spotify","appVersion":"4.2.0"}), "*");'

                console.log("seeking!");
                console.log(seekString);
                executeOnSpotifyPlayer(seekString);

            }, 1500);
        }
    }

    if (request.action == "pause") {
        executeOnSpotifyPlayer('window.top.postMessage(JSON.stringify({\"type\":\"bridge_request\",\"id\":" + nextEventId() + ",\"name\":\"player_pause\",\"args\":[\"main\"],\"appVendor\":\"com.spotify\",\"appVersion\":\"4.2.0\"}), \"*\");');
    }

    if (request.action == "star") {
        var starString = 'window.top.postMessage(JSON.stringify({"type":"bridge_request","id":' + nextEventId() + ',"name":"library_star","args":["spotify:user:' + spotifyUsername + '","spotify:track:' + request.trackId + '"],"appVendor":"com.spotify","appVersion":"3.6.0"}), "*");'
        console.log("starring!");
        console.log(starString);
        executeOnSpotifyPlayer(starString);
    }

    if (request.action == "open-spotify-uri") {
        var loadString= 'window.top.postMessage(JSON.stringify({"type":"bridge_request","id":' + nextEventId() + ',"name":"application_open_uri","args":["' + request.uri + '",null],"appVendor":"com.spotify","appVersion":"2.2.2"}), "*");'
        console.log("loading uri in spotify...");
        console.log(loadString);
        executeOnSpotifyPlayer(loadString);

        // select the spotify tab
        chrome.tabs.update(spotifyTab.id, {active: true});
    }

});
