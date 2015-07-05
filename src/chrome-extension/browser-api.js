

/* injected into app.soundbounce.org */
var actualCode = '(' + function() {


        window.spotifyBrowserApi = {
            getVersion: function () {
                return 'ChromeExtension0.1';
            },
            playTrack: function (trackId, position) {
                console.log('spotifyBrowserApi.playTrack ',trackId,position);
                chrome.runtime.sendMessage("apbdfongpgacifbamjfogfncjjhkaeih", {action: "play", trackId:trackId, position:position});
                console.log('done spotifyBrowserApi.playTrack ',trackId,position);
            },
            pauseTrack: function () {
                chrome.runtime.sendMessage("apbdfongpgacifbamjfogfncjjhkaeih", {action: "pause"});
            },
            starTrack: function (trackId){
                chrome.runtime.sendMessage("apbdfongpgacifbamjfogfncjjhkaeih", {action: "star", trackId: trackId});
            },
            openUrl: function (url){
                if(url.indexOf('spotify:')==0){
                    chrome.runtime.sendMessage("apbdfongpgacifbamjfogfncjjhkaeih", {action: "open-spotify-uri", uri:url});
                    return;
                }
                window.open(url);
            },
            openInSpotify: function(trackId){
               //gui.Shell.openExternal("spotify:track:"+trackId+"?action=browse");
                chrome.runtime.sendMessage("apbdfongpgacifbamjfogfncjjhkaeih", {action: "open-spotify-uri", uri: "spotify:track:"+trackId});
             //   window.open("spotify:track:"+trackId+"?action=browse");
            }
        };


    } + ')();';


var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

