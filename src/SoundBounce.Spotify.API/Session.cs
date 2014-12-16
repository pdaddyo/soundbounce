/*-
 * Originally Based on Jamcast Spotify Plugin
 *
 * 
 * Copyright (c) 2014 Software Development Solutions, Inc.
 * All rights reserved.
 * 
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

using System;
using System.Configuration;
using System.IO;
using System.Runtime.ExceptionServices;
using System.Runtime.InteropServices;
using NAudio.Wave;
using libspotifydotnet;

namespace SoundBounce.SpotifyAPI
{
    public static class Session
    {
        public static readonly log4net.ILog Log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);


        private static IntPtr _sessionPtr;
        private static WaveOut waveOut;
        private static BufferedWaveProvider soundBuffer;
        private delegate void connection_error_delegate(IntPtr sessionPtr, libspotify.sp_error error);

        private delegate void end_of_track_delegate(IntPtr sessionPtr);

        private delegate void get_audio_buffer_stats_delegate(IntPtr sessionPtr, IntPtr statsPtr);

        private delegate void log_message_delegate(IntPtr sessionPtr, string message);

        private delegate void logged_in_delegate(IntPtr sessionPtr, libspotify.sp_error error);

        private delegate void logged_out_delegate(IntPtr sessionPtr);

        private delegate void message_to_user_delegate(IntPtr sessionPtr, string message);

        private delegate void metadata_updated_delegate(IntPtr sessionPtr);

        private delegate int music_delivery_delegate(IntPtr sessionPtr, IntPtr formatPtr, IntPtr framesPtr, int num_frames);

        private delegate void notify_main_thread_delegate(IntPtr sessionPtr);

        private delegate void offline_status_updated_delegate(IntPtr sessionPtr);

        private delegate void play_token_lost_delegate(IntPtr sessionPtr);

        private delegate void start_playback_delegate(IntPtr sessionPtr);

        private delegate void stop_playback_delegate(IntPtr sessionPtr);

        private delegate void streaming_error_delegate(IntPtr sessionPtr, libspotify.sp_error error);

        private delegate void userinfo_updated_delegate(IntPtr sessionPtr);

        private static connection_error_delegate fn_connection_error_delegate = new connection_error_delegate(connection_error);
        private static end_of_track_delegate fn_end_of_track_delegate = new end_of_track_delegate(end_of_track);
        private static get_audio_buffer_stats_delegate fn_get_audio_buffer_stats_delegate = new get_audio_buffer_stats_delegate(get_audio_buffer_stats);
        private static log_message_delegate fn_log_message = new log_message_delegate(log_message);
        private static logged_in_delegate fn_logged_in_delegate = new logged_in_delegate(logged_in);
        private static logged_out_delegate fn_logged_out_delegate = new logged_out_delegate(logged_out);
        private static message_to_user_delegate fn_message_to_user_delegate = new message_to_user_delegate(message_to_user);
        private static metadata_updated_delegate fn_metadata_updated_delegate = new metadata_updated_delegate(metadata_updated);
        private static music_delivery_delegate fn_music_delivery_delegate = new music_delivery_delegate(music_delivery);
        private static notify_main_thread_delegate fn_notify_main_thread_delegate = new notify_main_thread_delegate(notify_main_thread);
        private static offline_status_updated_delegate fn_offline_status_updated_delegate = new offline_status_updated_delegate(offline_status_updated);
        private static play_token_lost_delegate fn_play_token_lost_delegate = new play_token_lost_delegate(play_token_lost);
        private static start_playback_delegate fn_start_playback = new start_playback_delegate(start_playback);
        private static stop_playback_delegate fn_stop_playback = new stop_playback_delegate(stop_playback);
        private static streaming_error_delegate fn_streaming_error_delegate = new streaming_error_delegate(streaming_error);
        private static userinfo_updated_delegate fn_userinfo_updated_delegate = new userinfo_updated_delegate(userinfo_updated);

        private static byte[] appkey = null;
        private static libspotify.sp_error _loginError = libspotify.sp_error.OK;
        private static bool _isLoggedIn = false;

        public static event Action<IntPtr> OnNotifyMainThread;
        public static event Action<IntPtr> OnPlayTokenLost;

        public static event Action<IntPtr> OnLoggedIn;

        public static event Action<byte[], libspotify.sp_audioformat, int> OnAudioDataArrived;

        public static event Action<object> OnAudioStreamComplete;
        public static object _lock = new object();

        public static IntPtr SessionPtr
        {
            get { return _sessionPtr; }
        }

        public static libspotify.sp_error LoginError
        {
            get { return _loginError; }
        }

        public static bool IsLoggedIn
        {
            get { return _isLoggedIn; }
        }

        public static void Login(object[] args)
        {
            Session.appkey = (byte[])args[0];

            if (_sessionPtr == IntPtr.Zero)
                _loginError = initSession();

            if (_loginError != libspotify.sp_error.OK)
                throw new ApplicationException(Utils.PtrToString(libspotify.sp_error_message(_loginError)));

            if (_sessionPtr == IntPtr.Zero)
                throw new InvalidOperationException("Session initialization failed, session pointer is null.");

            libspotify.sp_session_login(_sessionPtr, args[1].ToString(), args[2].ToString(), false, null);
        }

        public static void Logout()
        {
            if (_sessionPtr == IntPtr.Zero)
                return;

            libspotify.sp_session_logout(_sessionPtr);
            _sessionPtr = IntPtr.Zero;
        }

        public static int GetUserCountry()
        {
            if (_sessionPtr == IntPtr.Zero)
                throw new InvalidOperationException("No session.");

            return libspotify.sp_session_user_country(_sessionPtr);
        }

        // [HandleProcessCorruptedStateExceptions]
        public static libspotify.sp_error LoadPlayer(IntPtr trackPtr)
        {
            return libspotify.sp_session_player_load(_sessionPtr, trackPtr);

            return libspotify.sp_error.TRACK_NOT_PLAYABLE;
        }

        public static void LoadTrackIntoPlayer(object[] args)
        {
            IntPtr trackPtr = (IntPtr)args[0];
            LoadPlayer(trackPtr);
        }

        public static void Play()
        {
            lock (_lock)
            {
                libspotify.sp_session_player_play(_sessionPtr, true);
            }
        }

        public static void Seek(int offset)
        {
            lock (_lock)
            {
                libspotify.sp_session_player_seek(_sessionPtr, offset);
            }
        }

        public static void Pause()
        {
            lock (_lock)
            {
                libspotify.sp_session_player_play(_sessionPtr, false);
            }
        }

        public static void UnloadPlayer()
        {
            lock (_lock)
            {
                libspotify.sp_session_player_unload(_sessionPtr);
            }
        }

        private static libspotify.sp_error initSession()
        {
            lock (_lock)
            {
                waveOut = new WaveOut();

                libspotify.sp_session_callbacks callbacks = new libspotify.sp_session_callbacks();
                callbacks.connection_error = Marshal.GetFunctionPointerForDelegate(fn_connection_error_delegate);
                callbacks.end_of_track = Marshal.GetFunctionPointerForDelegate(fn_end_of_track_delegate);
                callbacks.get_audio_buffer_stats =
                    Marshal.GetFunctionPointerForDelegate(fn_get_audio_buffer_stats_delegate);
                callbacks.log_message = Marshal.GetFunctionPointerForDelegate(fn_log_message);
                callbacks.logged_in = Marshal.GetFunctionPointerForDelegate(fn_logged_in_delegate);
                callbacks.logged_out = Marshal.GetFunctionPointerForDelegate(fn_logged_out_delegate);
                callbacks.message_to_user = Marshal.GetFunctionPointerForDelegate(fn_message_to_user_delegate);
                callbacks.metadata_updated = Marshal.GetFunctionPointerForDelegate(fn_metadata_updated_delegate);
                callbacks.music_delivery = Marshal.GetFunctionPointerForDelegate(fn_music_delivery_delegate);
                callbacks.notify_main_thread = Marshal.GetFunctionPointerForDelegate(fn_notify_main_thread_delegate);
                callbacks.offline_status_updated =
                    Marshal.GetFunctionPointerForDelegate(fn_offline_status_updated_delegate);
                callbacks.play_token_lost = Marshal.GetFunctionPointerForDelegate(fn_play_token_lost_delegate);
                callbacks.start_playback = Marshal.GetFunctionPointerForDelegate(fn_start_playback);
                callbacks.stop_playback = Marshal.GetFunctionPointerForDelegate(fn_stop_playback);
                callbacks.streaming_error = Marshal.GetFunctionPointerForDelegate(fn_streaming_error_delegate);
                callbacks.userinfo_updated = Marshal.GetFunctionPointerForDelegate(fn_userinfo_updated_delegate);

                IntPtr callbacksPtr = Marshal.AllocHGlobal(Marshal.SizeOf(callbacks));
                Marshal.StructureToPtr(callbacks, callbacksPtr, true);

                libspotify.sp_session_config config = new libspotify.sp_session_config();
                config.api_version = libspotify.SPOTIFY_API_VERSION;
                config.user_agent = "SoundBounce";
                config.application_key_size = appkey.Length;
                config.application_key = Marshal.AllocHGlobal(appkey.Length);
                config.cache_location = Path.Combine(Path.GetTempPath(), "SoundBounce_temp");
                config.settings_location = Path.Combine(Path.GetTempPath(), "SoundBounce_temp");
                config.callbacks = callbacksPtr;
                config.compress_playlists = true;
                config.dont_save_metadata_for_playlists = false;
                config.initially_unload_playlists = false;

                Spotify.Log.DebugFormat("api_version={0}", config.api_version);
                Spotify.Log.DebugFormat("api_version={0}", config.api_version);
                Spotify.Log.DebugFormat("application_key_size={0}", config.application_key_size);
                Spotify.Log.DebugFormat("cache_location={0}", config.cache_location);
                Spotify.Log.DebugFormat("settings_location={0}", config.settings_location);

                Marshal.Copy(appkey, 0, config.application_key, appkey.Length);

                IntPtr sessionPtr;
                libspotify.sp_error err = libspotify.sp_session_create(ref config, out sessionPtr);

                if (err == libspotify.sp_error.OK)
                {
                    _sessionPtr = sessionPtr;
                    libspotify.sp_session_set_connection_type(sessionPtr,
                                                              libspotify.sp_connection_type.SP_CONNECTION_TYPE_WIRED);
                }

                // set high bitrate

                if (ConfigurationManager.AppSettings["HighBitrate"] == "true")
                {
                    libspotify.sp_error test = libspotify.sp_session_preferred_bitrate(sessionPtr,
                                                                                       libspotify.sp_bitrate
                                                                                                 .BITRATE_320k);
                    if (test != libspotify.sp_error.OK)
                        Spotify.Log.WarnFormat("sp_session_preferred_bitrate() to 320k failed: {0}", test);
                    else
                        Spotify.Log.Debug("sp_session_preferred_bitrate() to 320k succeeded!");
                }

                // normalize volume
                if (ConfigurationManager.AppSettings["NormalizeVolume"] == "true")
                {
                    libspotify.sp_session_set_volume_normalization(sessionPtr, true);
                }

                return err;
            }
        }

        private static void connection_error(IntPtr sessionPtr, libspotify.sp_error error)
        {
            Spotify.Log.ErrorFormat("Connection error: {0}", libspotify.sp_error_message(error));
        }

        private static void end_of_track(IntPtr sessionPtr)
        {

            if (waveOut.PlaybackState == PlaybackState.Playing)
                waveOut.Stop();

            if (Session.OnAudioStreamComplete != null)
                Session.OnAudioStreamComplete(null);
        }

        private static void log_message(IntPtr sessionPtr, string message)
        {
            if (message.EndsWith("\n"))
                message = message.Substring(0, message.Length - 1);

            if (message.Contains("facebook"))
            {
                Spotify.Log.DebugFormat("libspotify > facebook message, not logging");
            }
            else
            {
                Spotify.Log.DebugFormat("libspotify > " + message);
            }

        }

        private static void logged_in(IntPtr sessionPtr, libspotify.sp_error error)
        {
            if (error == libspotify.sp_error.OK)
            {
                _isLoggedIn = true;
            }

            _loginError = error;

            if (Session.OnLoggedIn != null)
                Session.OnLoggedIn(sessionPtr);
        }

        private static void logged_out(IntPtr sessionPtr)
        {
            _isLoggedIn = false;
        }

        private static void message_to_user(IntPtr sessionPtr, string message)
        {
            Spotify.Log.InfoFormat("libspotify message to user > {0}", message);
        }

        private static void metadata_updated(IntPtr sessionPtr)
        {
            Spotify.Log.Debug("spotify > metadata_updated");
        }

        private static int music_delivery(IntPtr sessionPtr, IntPtr formatPtr, IntPtr framesPtr, int num_frame)
        {

            if (num_frame == 0)
                return 0;

            libspotify.sp_audioformat format = (libspotify.sp_audioformat)Marshal.PtrToStructure(formatPtr, typeof(libspotify.sp_audioformat));
            byte[] buffer = new byte[num_frame * sizeof(Int16) * format.channels];
            Marshal.Copy(framesPtr, buffer, 0, buffer.Length);

            if (Session.OnAudioDataArrived != null)
                Session.OnAudioDataArrived(buffer, format, num_frame);


            if (soundBuffer == null)
            {
                SetupSoundOutput(format);
            }

            soundBuffer.AddSamples(buffer, 0, buffer.Length);

            return num_frame;
        }

        private static void SetupSoundOutput(libspotify.sp_audioformat format)
        {
            const int bitsPerSample = 16;
            int blockAlign = (format.channels * (bitsPerSample / 8));
            int averageBytesPerSecond = format.sample_rate * blockAlign;
            var waveFormat = WaveFormat.CreateCustomFormat(WaveFormatEncoding.Pcm, format.sample_rate, format.channels,
                                                           averageBytesPerSecond, blockAlign, bitsPerSample);

            soundBuffer = new BufferedWaveProvider(waveFormat);
            soundBuffer.BufferDuration = TimeSpan.FromSeconds(10);
            waveOut.Init(soundBuffer);
            
        }

        private static void get_audio_buffer_stats(IntPtr sessionPtr, IntPtr statsPtr)
        {
            libspotify.sp_audio_buffer_stats stats = (libspotify.sp_audio_buffer_stats)Marshal.PtrToStructure(statsPtr, typeof(libspotify.sp_audio_buffer_stats));

            // we can't report anything back if we're not set up yet.
            if (soundBuffer == null)
                return;

            stats.samples = soundBuffer.BufferedBytes / 2;

            // TODO: detect stutters and send back to spotify
            stats.stutter = 0;

            // write it back
            Marshal.StructureToPtr(stats, statsPtr, true);

        }


        private static void notify_main_thread(IntPtr sessionPtr)
        {
            if (OnNotifyMainThread != null)
                OnNotifyMainThread(_sessionPtr);
        }

        private static void offline_status_updated(IntPtr sessionPtr)
        {
            Spotify.Log.DebugFormat("offline_status_updated");
        }

        private static void play_token_lost(IntPtr sessionPtr)
        {
            Spotify.Log.DebugFormat("play_token_lost");
            if (OnPlayTokenLost != null)
                OnPlayTokenLost(_sessionPtr);
        }

        private static void start_playback(IntPtr sessionPtr)
        {
            if (waveOut != null)
            {
                try
                {
                    waveOut.Play();
                }
                catch (Exception ex)
                {
                    Spotify.Log.Error("Error on  waveOut.Play(); in start_playback:  " + ex.Message);
                }
            }


            Spotify.Log.DebugFormat("start_playback");
        }

        private static void stop_playback(IntPtr sessionPtr)
        {
            if (waveOut != null)
            {
                waveOut.Stop();
                soundBuffer.ClearBuffer();
                soundBuffer = null;

                // create a new waveOut to Init on next play..
                waveOut = new WaveOut();
            }
            Spotify.Log.DebugFormat("stop_playback");
        }

        private static void streaming_error(IntPtr sessionPtr, libspotify.sp_error error)
        {
            Spotify.Log.ErrorFormat("Streaming error: {0}", libspotify.sp_error_message(error));
        }

        private static void userinfo_updated(IntPtr sessionPtr)
        {
            //  Spotify.Log.DebugFormat("userinfo_updated");
        }


    }
}