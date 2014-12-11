/*-
 * Copyright (c) 2014 Software Development Solutions, Inc.
 * All rights reserved.
 * 
 * Based on Jamcast Spotify Plugin
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
using System.Collections.Generic;
using System.Runtime.ExceptionServices;
using System.Runtime.InteropServices;
using System.Threading;

using libspotifydotnet;

namespace SoundBounce.SpotifyAPI
{
    public static class Spotify
    {
        public static readonly log4net.ILog Log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public static object SyncObject = new object();

        private delegate bool Test();

        public delegate void MainThreadMessageDelegate(object[] args);

        private static AutoResetEvent _programSignal;
        private static AutoResetEvent _mainSignal;
        private static Queue<MainThreadMessage> _mq = new Queue<MainThreadMessage>();
        private static bool _shutDown = false;

        private static object _initSync = new object();
        private static bool _initted = false;
        private static bool _isRunning = false;
        private static bool _isLoggedIn = false;
        private static Action<IntPtr> d_notify = new Action<IntPtr>(Session_OnNotifyMainThread);
        private static Action<IntPtr> d_on_logged_in = new Action<IntPtr>(Session_OnLoggedIn);
        private static Thread _t;
        private static object _loginLock = new object();

        private static readonly int REQUEST_TIMEOUT = 10;

        private class MainThreadMessage
        {
            public MainThreadMessageDelegate d;
            public object[] payload;
        }

        static Spotify()
        {
            Session.OnNotifyMainThread += d_notify;
            Session.OnLoggedIn += d_on_logged_in;
        }

        public static bool IsRunning
        {
            get { return _isRunning; }
        }

        public static bool IsLoggedIn
        {
            get { return _isLoggedIn; }
        }

        public static bool Login(string username, string password)
        {

            lock (_initSync)
            {
                if (!_initted)
                    throw new ApplicationException("Spotify message thread not initialized");
            }

            lock (_loginLock)
            {
                if (_isLoggedIn)
                    return true;

                postMessage(Session.Login, new object[] { Keys.LibSpotifyKey, username, password });

                _programSignal.WaitOne();

                if (Session.LoginError != libspotify.sp_error.OK)
                {
                    Spotify.Log.ErrorFormat("Login failed: {0}", libspotify.sp_error_message(Session.LoginError));
                    return false;
                }

                return true;
            }
        }

        public static void Initialize()
        {
            if (_initted)
                return;

            lock (_initSync)
            {
                try
                {
                    _programSignal = new AutoResetEvent(false);
                    _shutDown = false;
                    _t = new Thread(new ThreadStart(mainThread));
                    _t.Start();

                    _programSignal.WaitOne();

                    Spotify.Log.DebugFormat("Message thread running...");

                    _initted = true;
                }
                catch
                {
                    Session.OnNotifyMainThread -= d_notify;
                    Session.OnLoggedIn -= d_on_logged_in;

                    if (_t != null)
                    {
                        try
                        {
                            _t.Abort();
                        }
                        catch { }
                        finally
                        {
                            _t = null;
                        }
                    }
                }
            }
        }

        public static string GetTrackLink(IntPtr trackPtr)
        {
            return GetTrackLink(trackPtr, 0);
        }

        public static string GetTrackLink(IntPtr trackPtr, int offset)
        {
            if (Session.SessionPtr == IntPtr.Zero)
                throw new ApplicationException("No session");

            IntPtr linkPtr = libspotify.sp_link_create_from_track(trackPtr, offset);
            try
            {
                return Utils.LinkPtrToString(linkPtr);
            }
            finally
            {
                if (linkPtr != IntPtr.Zero)
                    libspotify.sp_link_release(linkPtr);
            }
        }




        private static bool waitFor(Test t, int timeout)
        {
            DateTime start = DateTime.Now;

            while (DateTime.Now.Subtract(start).Seconds < timeout)
            {
                if (t.Invoke())
                {
                    return true;
                }

                Thread.Sleep(10);
            }

            return false;
        }

        public static void ShutDown()
        {

            lock (SyncObject)
            {
                if (_mainSignal != null)
                    _mainSignal.Set();
                _mainSignal = null;
                _t = null;
                _shutDown = true;

                if (Session.SessionPtr != IntPtr.Zero)
                {
                    try
                    {
                        libspotify.sp_error err = libspotify.sp_session_player_unload(Session.SessionPtr);
                        err = libspotify.sp_session_logout(Session.SessionPtr);
                        err = libspotify.sp_session_release(Session.SessionPtr);
                        Spotify.Log.DebugFormat("Successfully closed libspotify session.");
                    }
                    catch (Exception ex)
                    {
                        Spotify.Log.ErrorFormat("Error cleaning up session: {0}", ex);
                    }
                }
                _isLoggedIn = false;
                _initted = false;
            }

            _programSignal.WaitOne(2000, false);
            _programSignal = null;
        }

        //   [HandleProcessCorruptedStateExceptions]
        private static void mainThread()
        {
            try
            {
                _mainSignal = new AutoResetEvent(false);

                int timeout = Timeout.Infinite;
                DateTime lastEvents = DateTime.MinValue;

                _isRunning = true;
                _programSignal.Set(); // this signals to program thread that loop is running

                while (true)
                {
                    if (_shutDown)
                        break;

                    _mainSignal.WaitOne(timeout, false);

                    if (_shutDown)
                        break;

                    lock (SyncObject)
                    {

                        if (Session.SessionPtr != IntPtr.Zero)
                        {
                            do
                            {
                                libspotify.sp_session_process_events(Session.SessionPtr, out timeout);

                            } while (!_shutDown && timeout == 0);
                        }


                        while (_mq.Count > 0)
                        {
                            MainThreadMessage m = _mq.Dequeue();
                            m.d.Invoke(m.payload);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Spotify.Log.ErrorFormat("mainThread() unhandled exception: {0}", ex);
            }
            finally
            {
                _isRunning = false;
                if (_programSignal != null)
                    _programSignal.Set();
            }
        }

        public static void Session_OnLoggedIn(IntPtr obj)
        {
            if (Session.LoginError == libspotify.sp_error.OK)
                _isLoggedIn = true;
            if (_programSignal != null)
                _programSignal.Set();
        }

        public static void Session_OnNotifyMainThread(IntPtr sessionPtr)
        {
            if (_mainSignal != null)
                _mainSignal.Set();
        }

        public static void PostMessage(MainThreadMessageDelegate d, object[] payload)
        {
            postMessage(d, payload);
        }

        private static void postMessage(MainThreadMessageDelegate d, object[] payload)
        {
            if (_mq == null)
                throw new ApplicationException("Message queue has not been initialized");

            _mq.Enqueue(new MainThreadMessage() { d = d, payload = payload });

            lock (SyncObject)
            {
                _mainSignal.Set();
            }
        }
    }
}