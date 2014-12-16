using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using SoundBounce.SpotifyAPI;

namespace SoundBounce.WindowsClient
{
    public class SpotifyEnabledBrowser : ChromiumWebBrowser
    {
        public static readonly log4net.ILog Log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        public static readonly string BaseURL = ConfigurationManager.AppSettings["BaseURL"];
        private bool HasLoaded { get; set; }
        private SpotifyBrowserAPI browserApi;
        private static readonly bool DebuggingSubProcess = true;// Debugger.IsAttached; // for now we're always gonna attach this to let end users access dev tools

        private string themeFileName = ConfigurationManager.AppSettings["ThemeFile"] ?? "default.css";

        public static SpotifyEnabledBrowser Singleton;

        // default to spotify login screen
        public SpotifyEnabledBrowser()
            : base(BaseURL + "login.html")
        {
            Singleton = this;
            Spotify.Initialize();

            Session.OnLoggedIn += SessionOnOnLoggedIn;
            Session.OnPlayTokenLost += PlayTokenLost;
            HandleCreated += SpotifyEnabledBrowser_HandleCreated;
            ConsoleMessage += SpotifyEnabledBrowser_ConsoleMessage;
            Disposed += SpotifyEnabledBrowser_Disposed;
            IsLoadingChanged += SpotifyEnabledBrowser_IsLoadingChanged;

        }

        private void PlayTokenLost(IntPtr obj)
        {
            this.ExecuteScriptAsync("eventbus.trigger('play-token-lost');");
        }



        public static void Init()
        {
            var settings = new CefSettings
            {
                RemoteDebuggingPort = 8088,
                LogFile = "browser-log.txt",
                //    PackLoadingDisabled = true,
                UserAgent = "SoundBounce",
                CachePath = Path.GetTempPath()
            };

            if (DebuggingSubProcess)
            {
                settings.BrowserSubprocessPath = "CefSharp.BrowserSubprocess.exe";
            }

            if (!Cef.Initialize(settings))
            {
                Log.Error("Fatal: Cef failed to initialize. ");
                MessageBox.Show("Fatal: Cef failed to initialize.");
                Environment.Exit(0);
            }

            Log.InfoFormat("Cef version {0} initialized OK.", settings.ProductVersion);
        }

        private void SessionOnOnLoggedIn(IntPtr intPtr)
        {
            if (Session.IsLoggedIn)
            {
                // called from diff thread
                BeginInvoke(new Action(() =>
                    {
                        // we're logged in with libspotify, so let's pass this to the web app
                        var username = browserApi.getUsername().ToLower();

                        var url = string.Format("{0}spotify-login/{1}?secret={2}&version={3}", BaseURL, username,
                                                SpotifyAPI.Keys.SHA256(username + SpotifyAPI.Keys.LoginPepper),
                                                ConfigurationManager.AppSettings["clientVersion"]);

                        this.Load(url);

                        if (ConfigurationManager.AppSettings["ShowDevTools"] == "true")
                            this.ShowDevTools();

                    }
                    ));
            }
            else
            {
                BeginInvoke(new Action(() =>
                    {
                        MessageBox.Show("Login failed, please check and try again.");
                        Application.Exit();
                    }));
            }
        }

        void SpotifyEnabledBrowser_HandleCreated(object sender, EventArgs e)
        {
            RegisterAPI();
        }

        private void SpotifyEnabledBrowser_IsLoadingChanged(object sender, IsLoadingChangedEventArgs e)
        {
            if (!e.IsLoading)
            {
                string css = File.ReadAllText("themes\\" + this.themeFileName);

                css = css.Replace("\r", "").Replace("\n", "").Replace("'", "\"");

                // try and inject the theme CSS
                this.ExecuteScriptAsync(@"var css = '" + css + @"',
                        head = document.getElementsByTagName('head')[0],
                        style = document.createElement('style');

                    style.type = 'text/css';
                    if (style.styleSheet){
                      style.styleSheet.cssText = css;
                    } else {
                      style.appendChild(document.createTextNode(css));
                    }
                    head.appendChild(style);");
            }
        }

        private void RegisterAPI()
        {
            // add API to DOM
            browserApi = new SpotifyBrowserAPI();
            RegisterJsObject("spotifyBrowserApi", browserApi);
        }

        void SpotifyEnabledBrowser_Disposed(object sender, EventArgs e)
        {
            Spotify.ShutDown();
        }

        void SpotifyEnabledBrowser_ConsoleMessage(object sender, ConsoleMessageEventArgs e)
        {
            Log.DebugFormat("From {0} Line {1}:  {2}", e.Source, e.Line, e.Message);
        }

        public void SendTrackFailedMessage(string errorMessage)
        {
            this.ExecuteScriptAsync("eventbus.trigger('track-load-failed','" + errorMessage.Replace("'", "\"") + "')");
        }

        public void SendCurrentlyPlayingTrackIsStarred()
        {
            this.ExecuteScriptAsync("eventbus.trigger('playing-track-is-starred');");
        }
    }
}
