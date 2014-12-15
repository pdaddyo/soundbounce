using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using SoundBounce.SpotifyAPI;
using libspotifydotnet;

namespace SoundBounce.WindowsClient
{
    /// <summary>
    /// 
    /// These functions are all called by the hosted browser
    /// 
    /// Follows JS naming conventions, i.e. camelCase
    /// 
    /// </summary>
    class SpotifyBrowserAPI
    {

        private string username;

        public string getUsername()
        {
            return username;
        }

        public string getVersion()
        {
            return ConfigurationManager.AppSettings["ClientVersion"];
        }

        public void login(string username, string password)
        {
            this.username = username;
            Task task = Task.Factory.StartNew(() => Spotify.Login(username, password));
        }

        public void openInSpotify(string trackId)
        {
            Process.Start("spotify:track:" + trackId+"?action=browse");
        }

        public void pauseTrack()
        {
            Session.Pause();
        }

        // plays the given track at the given position in ms
        public void playTrack(string trackId, int position)
        {
            // move to the spotify thread
            Spotify.PostMessage(PlayTrack, new object[] {trackId, position});
        }

        private void PlayTrack(object[] args)
        {
            string trackId = (string) args[0];
            int position = (int)args[1];

            var track = new Track("spotify:track:" + trackId);

            var error = Session.LoadPlayer( track.TrackPtr );

            if (error != libspotify.sp_error.OK)
            {
                SpotifyEnabledBrowser.Singleton.SendTrackFailedMessage(error.ToString());
                return;
            }
            
            if (position > 500) // fix: we'd rather lose the last 0.5 secs than the first (was >0)
            {
                Session.Seek(position);
            }

            Session.Play();
        }

     
        public SpotifyBrowserAPI()
        {


        }

    }
}
