package org.soundbounce.soundbounce.interfaces;

import android.content.Intent;
import android.net.Uri;

import com.spotify.sdk.android.playback.PlayConfig;

import org.acra.ACRA;
import org.soundbounce.soundbounce.activities.MainActivity;
import org.soundbounce.soundbounce.helpers.CustomLog;
import org.xwalk.core.JavascriptInterface;

public class SpotifyBrowserAPIInterface {

    public SpotifyBrowserAPIInterface() {

    }

    protected final String LOG_TAG = "SpotifyBrowserAPIInterface";
    protected String username;

    @JavascriptInterface
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    @JavascriptInterface
    public String getVersion() {
        String versionName = "Unknown";

        try {
            versionName = MainActivity.getInstance().getPackageManager().getPackageInfo(MainActivity.getInstance().getPackageName(), 0).versionName;
        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }

        return versionName;
    }

    @JavascriptInterface
    public void login(String username, String password) {
        try {
            launchSpotifyAuth();

        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }
    }

    @JavascriptInterface
    public void launchSpotifyAuth() {
        try {
            MainActivity.getInstance().runOnUiThread(new Runnable() {
                public void run() {
                    MainActivity.getInstance().launchSpotifyAuthentication();
                }
            });

        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }
    }

    @JavascriptInterface
    public void openInSpotify(String trackId) {
        try {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("spotify:track:" + trackId + "?action=browse"));
            MainActivity.getInstance().startActivity(browserIntent);

        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }
    }

    @JavascriptInterface
    public void pauseTrack() {
        try {
            MainActivity.getInstance().runOnUiThread(new Runnable() {
                public void run() {
                    MainActivity.getInstance().getPlayer().pause();
                }
            });

        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }
    }

    // plays the given track at the given position in ms
    @JavascriptInterface
    public void playTrack(String trackId, int position) {
        try {
            final String trackURI = "spotify:track:" + trackId;

            final PlayConfig trackPositionPlayConfig = PlayConfig.createFor(trackURI);
            trackPositionPlayConfig.withInitialPosition(position);

            MainActivity.getInstance().runOnUiThread(new Runnable() {
                public void run() {
                    MainActivity.getInstance().getPlayer().play(trackPositionPlayConfig);
                }
            });

        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }
    }

    @JavascriptInterface
    public void starTrack(String trackId) {
    }

    @JavascriptInterface
    public void openUrl(String url) {
        try {

            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            MainActivity.getInstance().startActivity(browserIntent);

        } catch (Exception e) {
            CustomLog.exception(LOG_TAG, e);

            ACRA.getErrorReporter().handleException(e, true);
        }
    }

}
