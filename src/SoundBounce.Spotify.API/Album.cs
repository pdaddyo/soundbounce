/*-
 * Copyright (c) 2014 Software Development Solutions, Inc.
 * All rights reserved.
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



using libspotifydotnet;

namespace SoundBounce.SpotifyAPI
{
    public class Album : IDisposable
    {
        private bool _disposed;
        private IntPtr _browsePtr;
        private albumbrowse_complete_cb_delegate _d;

        public string Name { get; private set; }

        public IntPtr AlbumPtr { get; private set; }

        public string Artist { get; private set; }

        public bool IsBrowseComplete { get; private set; }

        public List<IntPtr> TrackPtrs { get; private set; }

        public libspotify.sp_albumtype Type { get; private set; }

        public Album(IntPtr albumPtr)
        {
            if (albumPtr == IntPtr.Zero)
                throw new InvalidOperationException("Album pointer is null.");

            this.AlbumPtr = albumPtr;
            this.Name = Utils.PtrToString(libspotify.sp_album_name(albumPtr));
            this.Type = libspotify.sp_album_type(albumPtr);
            IntPtr artistPtr = libspotify.sp_album_artist(albumPtr);
            if (artistPtr != IntPtr.Zero)
                this.Artist = Utils.PtrToString(libspotify.sp_artist_name(artistPtr));
        }

        public string GetAlbumArtLink()
        {
            IntPtr linkPtr = libspotify.sp_link_create_from_album_cover(this.AlbumPtr, libspotify.sp_image_size.SP_IMAGE_SIZE_LARGE);
            if (linkPtr == IntPtr.Zero)
            {
                Spotify.Log.DebugFormat("No link could be created for album cover");
                return null;
            }
            try
            {
                var s = Utils.LinkPtrToString(linkPtr);
                //Log.Debug(Plugin.LOG_MODULE, "<< Album.GetAlbumArtLink() link={0}", s);
                return s;
            }
            finally
            {
                if (linkPtr != IntPtr.Zero)
                    libspotify.sp_link_release(linkPtr);
            }
        }

        #region IDisposable Members

        public void Dispose()
        {
            dispose(true);
            GC.SuppressFinalize(this);
        }

        ~Album()
        {
            dispose(false);
        }

        private void dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    safeReleaseAlbum();
                }

                _disposed = true;
            }
        }

        #endregion IDisposable Members

        private void safeReleaseAlbum()
        {
            if (this._browsePtr != IntPtr.Zero)
            {
                try
                {
                    // necessary metadata is destroyed if the browse is released here...
                    //libspotify.sp_albumbrowse_release(_browsePtr);
                }
                catch { }
            }
        }

        private void albumbrowse_complete(IntPtr result, IntPtr userDataPtr)
        {
            try
            {
                libspotify.sp_error error = libspotify.sp_albumbrowse_error(result);

                if (error != libspotify.sp_error.OK)
                {
                    Spotify.Log.DebugFormat("Album browse failed: {0}", libspotify.sp_error_message(error));
                    return;
                }

                int numtracks = libspotify.sp_albumbrowse_num_tracks(_browsePtr);

                List<IntPtr> trackPtrs = new List<IntPtr>();

                for (int i = 0; i < libspotify.sp_albumbrowse_num_tracks(_browsePtr); i++)
                {
                    trackPtrs.Add(libspotify.sp_albumbrowse_track(_browsePtr, i));
                }

                this.TrackPtrs = trackPtrs;

                this.IsBrowseComplete = true;
            }
            finally
            {
                safeReleaseAlbum();
            }
        }

        public bool BeginBrowse()
        {
            try
            {
                _d = new albumbrowse_complete_cb_delegate(this.albumbrowse_complete);
                IntPtr callbackPtr = Marshal.GetFunctionPointerForDelegate(_d);
                _browsePtr = libspotify.sp_albumbrowse_create(Session.SessionPtr, this.AlbumPtr, callbackPtr, IntPtr.Zero);

                return true;
            }
            catch (Exception ex)
            {
                Spotify.Log.DebugFormat("Album.BeginBrowse() failed: {0}", ex.Message);
                return false;
            }
        }
    }
}