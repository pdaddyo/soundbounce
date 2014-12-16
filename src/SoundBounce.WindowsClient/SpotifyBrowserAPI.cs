using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
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
        public static readonly log4net.ILog Log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

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

        public void starTrack(string trackId)
        {
            Spotify.PostMessage(StarTrack, new object[] { trackId });
        }

        public void openUrl(string url)
        {
            Process.Start(url);
        }


        /* private methods */

        private IntPtr lastLoadedTrackPtr;

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

            lastLoadedTrackPtr = track.TrackPtr;

            if (position > 500) // fix: we'd rather lose the last 0.5 secs than the first (was >0)
            {
                Session.Seek(position);
            }

            Session.Play();

            // should be loaded, now check if it's starred
            if (libspotify.sp_track_is_starred(Session.SessionPtr, track.TrackPtr))
            {
                Log.Debug("track is starred? "); // this is called for every track - bug in libspotify???

               // SpotifyEnabledBrowser.Singleton.SendCurrentlyPlayingTrackIsStarred();
            }
        }

        private void StarTrack(object[] args)
        {
            var trackId = (string)args[0];
            
            //IntPtr ptr = AllocateIntArray(5);
            var track = new Track("spotify:track:" + trackId);


           Log.Debug("trackPtr: " + track.TrackPtr.ToString());

            IntPtr unmanagedPointer = IntPtr.Zero;
            try
            {
                // marshal track pointer into an unmanaged array  (starring api call needs an array of track pointers)
                IntPtr[] ids = new IntPtr[1] {track.TrackPtr};

                unmanagedPointer = Marshal.AllocHGlobal(ids.Length);
                Marshal.Copy(ids, 0, unmanagedPointer, ids.Length);

                lock (Session._lock)
                {
                    var error = libspotify.sp_track_set_starred(Session.SessionPtr, unmanagedPointer,
                                                                1, true);

                    if (error != libspotify.sp_error.OK)
                    {
                        SpotifyEnabledBrowser.Singleton.SendTrackFailedMessage("Unable to star: " + error.ToString());
                        return;
                    }
                }
            }
            finally
            {
                if(unmanagedPointer!=IntPtr.Zero)
                    Marshal.FreeHGlobal(unmanagedPointer);    
            }
            


        }
     
        public SpotifyBrowserAPI()
        {


        }

    }
}
