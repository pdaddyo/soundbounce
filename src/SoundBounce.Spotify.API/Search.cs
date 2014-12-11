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
using System.Runtime.InteropServices;
using System.Runtime.Serialization;

using libspotifydotnet;

namespace SoundBounce.SpotifyAPI
{
    public class Search : IDisposable
    {
        private static readonly string LOG_MODULE = "Search";

        private bool _disposed;
        private IntPtr _searchPtr;
        private IntPtr _callbackPtr;
        private search_complete_cb_delegate _d;

        public delegate void search_complete_cb_delegate(IntPtr result, IntPtr userDataPtr);

        public bool IsLoaded { get; private set; }

        public List<IntPtr> TrackPtrs { get; private set; }

        public List<IntPtr> AlbumPtrs { get; private set; }

        public List<IntPtr> ArtistPtrs { get; private set; }

        public List<PlaylistSearchResult> PlaylistResults { get; private set; }

     
        public class PlaylistSearchResult 
        {
            public String Link { get; set; }
            public String Name { get; set; }
            public int GetPersistenceHash()
            {
                return Link.GetHashCode();
            }
            public override string ToString()
            {
                return this.Link;
            }
        }

        #region IDisposable Members

        public void Dispose()
        {
            dispose(true);
            GC.SuppressFinalize(this);
        }

        ~Search()
        {
            dispose(false);
        }

        private void dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    safeReleaseSearch();
                }

                _disposed = true;
            }
        }

        #endregion IDisposable Members

        public static Search BeginSearch(string keywords)
        {
            try
            {
                Search search = new Search();
                search._d = new search_complete_cb_delegate(search.search_complete);
                search._callbackPtr = Marshal.GetFunctionPointerForDelegate(search._d);
                search._searchPtr = libspotify.sp_search_create(Session.SessionPtr, Utils.StringToPtr(keywords), 0, 50, 0, 50, 0, 50, 0, 50, sp_search_type.SP_SEARCH_STANDARD, search._callbackPtr, IntPtr.Zero);
                return search;
            }
            catch (Exception ex)
            {
                Spotify.Log.ErrorFormat("Search.BeginSearch() failed: {0}", ex.Message);
                return null;
            }
        }

        public libspotify.sp_error GetSearchError()
        {
            return libspotify.sp_search_error(_searchPtr);
        }

        private void search_complete(IntPtr result, IntPtr userDataPtr)
        {
            if (_searchPtr == IntPtr.Zero)
                throw new ApplicationException("Search pointer is null");

            libspotify.sp_error error = libspotify.sp_search_error(_searchPtr);

            if (error != libspotify.sp_error.OK)
            {
                Spotify.Log.ErrorFormat("ERROR: Search failed: {0}", Utils.PtrToString(libspotify.sp_error_message(error)));
                this.IsLoaded = true;
                return;
            }

            this.TrackPtrs = new List<IntPtr>();
            for (int i = 0; i < libspotify.sp_search_num_tracks(_searchPtr); i++)
            {
                this.TrackPtrs.Add(libspotify.sp_search_track(_searchPtr, i));
            }

            this.ArtistPtrs = new List<IntPtr>();
            for (int i = 0; i < libspotify.sp_search_num_artists(_searchPtr); i++)
            {
                this.ArtistPtrs.Add(libspotify.sp_search_artist(_searchPtr, i));
            }

            this.AlbumPtrs = new List<IntPtr>();
            for (int i = 0; i < libspotify.sp_search_num_albums(_searchPtr); i++)
            {
                this.AlbumPtrs.Add(libspotify.sp_search_album(_searchPtr, i));
            }

            this.PlaylistResults = new List<PlaylistSearchResult>();
            for (int i = 0; i < libspotify.sp_search_num_playlists(_searchPtr); i++)
            {                
                this.PlaylistResults.Add(new PlaylistSearchResult()
                {
                    Link = Utils.PtrToString(libspotify.sp_search_playlist_uri(_searchPtr, i)),
                    Name = Utils.PtrToString(libspotify.sp_search_playlist_name(_searchPtr, i)),                    
                });
            }

            this.IsLoaded = true;
        }

        private void safeReleaseSearch()
        {
            if (_searchPtr != IntPtr.Zero)
            {
                try
                {
                    var err = libspotify.sp_search_release(_searchPtr);
                    if (err == libspotify.sp_error.OK)
                    {
                        Spotify.Log.DebugFormat("Search was released successfully");
                    }
                    else
                    {
                         Spotify.Log.WarnFormat("Search released with errors: {0}", err);
                    }
                }
                catch { }
                finally
                {
                    _searchPtr = IntPtr.Zero;
                }
            }
        }
    }
}