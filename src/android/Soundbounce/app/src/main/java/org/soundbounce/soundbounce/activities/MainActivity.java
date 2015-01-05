package org.soundbounce.soundbounce.activities;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;

import com.spotify.sdk.android.Spotify;
import com.spotify.sdk.android.authentication.AuthenticationResponse;
import com.spotify.sdk.android.authentication.SpotifyAuthentication;
import com.spotify.sdk.android.playback.Config;
import com.spotify.sdk.android.playback.ConnectionStateCallback;
import com.spotify.sdk.android.playback.Player;
import com.spotify.sdk.android.playback.PlayerNotificationCallback;
import com.spotify.sdk.android.playback.PlayerState;

import org.apache.commons.codec.binary.Hex;
import org.json.JSONObject;
import org.soundbounce.soundbounce.R;
import org.soundbounce.soundbounce.helpers.CustomLog;
import org.soundbounce.soundbounce.helpers.CustomXWalkView;
import org.soundbounce.soundbounce.helpers.Utilities;
import org.soundbounce.soundbounce.interfaces.OnTaskCompletedInterface;
import org.soundbounce.soundbounce.interfaces.SpotifyBrowserAPIInterface;
import org.soundbounce.soundbounce.tasks.HttpRequestAsyncTask;
import org.xwalk.core.XWalkPreferences;
import org.xwalk.core.XWalkResourceClient;
import org.xwalk.core.XWalkUIClient;
import org.xwalk.core.XWalkView;
import org.xwalk.core.internal.XWalkSettings;
import org.xwalk.core.internal.XWalkViewBridge;

import java.lang.reflect.Method;
import java.security.MessageDigest;
import java.util.HashMap;

public class MainActivity extends Activity implements OnTaskCompletedInterface, PlayerNotificationCallback, ConnectionStateCallback {

    protected final String LOG_TAG = "MainActivity";

    protected static MainActivity singleton;
    protected SpotifyBrowserAPIInterface javaScriptInterface;
    protected CustomXWalkView mXwalkView = null;
    protected String userAgentString;

    protected Player mPlayer;

    protected String currentSpotifyAccessToken = null;
    protected ProgressDialog appLoadingProgress;
    protected ProgressDialog spotifyLoadingProgress;

    class MyResourceClient extends XWalkResourceClient {
        MyResourceClient(XWalkView view) {
            super(view);
        }

        @Override
        public boolean shouldOverrideUrlLoading(XWalkView view, String url) {
            CustomLog.callingMethod(LOG_TAG);

            if (url.startsWith("soundbounce:")) {

                CustomLog.i(LOG_TAG, "Caught soundbounce url: " + url);
                processSpotifyAuthCallbackURL(url);

                return true;
            }

            return false;
        }

        @Override
        public void onLoadStarted(XWalkView view, String url) {
            //CustomLog.callingMethod(LOG_TAG);
            CustomLog.v(LOG_TAG, "Started loading url: " + url);
        }

        @Override
        public void onLoadFinished(XWalkView view, String url) {
            CustomLog.callingMethod(LOG_TAG);

            CustomLog.i(LOG_TAG, "Finished loading url: " + url);

            if (url.contains("app.html#home")) {
                if(appLoadingProgress != null)
                {
                    appLoadingProgress.dismiss();
                }

                if(spotifyLoadingProgress != null)
                {
                    spotifyLoadingProgress.dismiss();
                }
            }

            if (url.contains("accounts.spotify.com")) {

                if(spotifyLoadingProgress != null)
                {
                    spotifyLoadingProgress.dismiss();
                }
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        CustomLog.callingMethod(LOG_TAG);

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            quitSoundbounce();

            return false;
        }

        return super.onKeyDown(keyCode, event);
    }

    protected void processSpotifyAuthCallbackURL(String url) {
        CustomLog.callingMethod(LOG_TAG);

        if(spotifyLoadingProgress != null)
        {
            spotifyLoadingProgress.dismiss();
        }

        appLoadingProgress = new ProgressDialog(this);
        appLoadingProgress.setMessage("Authenticating with Spotify...");
        appLoadingProgress.setIndeterminate(true);
        appLoadingProgress.setCancelable(false);
        appLoadingProgress.show();

        Uri responseURI = Uri.parse(url);
        AuthenticationResponse response = SpotifyAuthentication.parseOauthResponse(responseURI);

        currentSpotifyAccessToken = response.getAccessToken();

        String authenticatedUserProfileURL = "https://api.spotify.com/v1/me";

        HashMap<String, String> httpHeaders = new HashMap<String, String>();
        httpHeaders.put("Authorization", "Bearer " + currentSpotifyAccessToken);

        // Create and execute the HTTP request task
        HttpRequestAsyncTask httpRequestAsyncTask = new HttpRequestAsyncTask(this, this, "GetSpotifyUserProfile", "GET", authenticatedUserProfileURL, 5000, null, httpHeaders, null, null);
        httpRequestAsyncTask.execute();
    }

    class MyUIClient extends XWalkUIClient {
        MyUIClient(XWalkView view) {
            super(view);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        CustomLog.callingMethod(LOG_TAG);

        if (mXwalkView != null) {
            mXwalkView.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        CustomLog.callingMethod(LOG_TAG);

        super.onCreate(savedInstanceState);
        singleton = this;

        // Set up window and content view to hold full screen webview
        getWindow().requestFeature(Window.FEATURE_NO_TITLE);

        spotifyLoadingProgress = new ProgressDialog(this);
        spotifyLoadingProgress.setMessage("Loading Soundbounce...");
        spotifyLoadingProgress.setIndeterminate(true);
        spotifyLoadingProgress.setCancelable(false);
        spotifyLoadingProgress.show();

        XWalkPreferences.setValue(XWalkPreferences.REMOTE_DEBUGGING, true);
        XWalkPreferences.setValue(XWalkPreferences.ALLOW_UNIVERSAL_ACCESS_FROM_FILE, true);
        XWalkPreferences.setValue(XWalkPreferences.JAVASCRIPT_CAN_OPEN_WINDOW, true);

        mXwalkView = new CustomXWalkView(this, this);
        setContentView(mXwalkView);
        mXwalkView.setResourceClient(new MyResourceClient(mXwalkView));
        mXwalkView.setUIClient(new MyUIClient(mXwalkView));

        mXwalkView.addJavascriptInterface(getJavaScriptInterface(), "spotifyBrowserApi");

        userAgentString = "Soundbounce-Android-" + getJavaScriptInterface().getVersion();

        Method ___getBridge = null;
        try {
            ___getBridge = XWalkView.class.getDeclaredMethod("getBridge");
            ___getBridge.setAccessible(true);
            XWalkViewBridge xWalkViewBridge = null;
            xWalkViewBridge = (XWalkViewBridge) ___getBridge.invoke(mXwalkView);
            XWalkSettings xWalkSettings = xWalkViewBridge.getSettings();
            xWalkSettings.setUserAgentString(userAgentString);
        } catch (Exception e) {
            e.printStackTrace();
        }

        setContentView(mXwalkView);

        String spotifyAuthURL = "https://accounts.spotify.com/authorize/?client_id=" + getString(R.string.client_id) +
                "&response_type=token" +
                "&redirect_uri=soundbounce%3A%2F%2Fcallback" +
                "&scope=user-read-private%20streaming";

        //mXwalkView.load("http://app.soundbounce.org/login.html", null);

        CustomLog.i(LOG_TAG, "Loading spotifyAuthURL: " + spotifyAuthURL);

        mXwalkView.load(spotifyAuthURL, null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        CustomLog.callingMethod(LOG_TAG);

        super.onNewIntent(intent);
    }

    @Override
    public void onBackPressed() {
        CustomLog.callingMethod(LOG_TAG);

        quitSoundbounce();
    }

    public void quitSoundbounce() {
        CustomLog.callingMethod(LOG_TAG);

        finish();
    }

    @Override
    public void onLoggedIn() {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "User logged in");
    }

    @Override
    public void onLoggedOut() {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "User logged out");
    }

    @Override
    public void onLoginFailed(Throwable error) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "Login failed");
    }

    @Override
    public void onTemporaryError() {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "Temporary error occurred");
    }

    @Override
    public void onNewCredentials(String s) {
        CustomLog.d(LOG_TAG, "User credentials blob received: " + s);
    }

    @Override
    public void onConnectionMessage(String message) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "Received connection message: " + message);
    }

    @Override
    public void onPlaybackEvent(EventType eventType, PlayerState playerState) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "Playback event received: " + eventType.name());
    }

    @Override
    public void onPlaybackError(ErrorType errorType, String errorDetails) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.d(LOG_TAG, "Playback error received: " + errorType.name());
    }

    @Override
    protected void onDestroy() {
        CustomLog.callingMethod(LOG_TAG);

        Spotify.destroyPlayer(this);
        super.onDestroy();
    }

    public static MainActivity getInstance() {
        return singleton;
    }

    public SpotifyBrowserAPIInterface getJavaScriptInterface() {
        CustomLog.callingMethod(LOG_TAG);

        if (javaScriptInterface == null) {
            javaScriptInterface = new SpotifyBrowserAPIInterface();
        }
        return javaScriptInterface;
    }

    public Player getPlayer() {
        CustomLog.callingMethod(LOG_TAG);

        return mPlayer;
    }

    public String getUserAgentString() {
        CustomLog.callingMethod(LOG_TAG);

        return userAgentString;
    }

    @Override
    public void onTaskCompleted(AsyncTask<Object, Object, Boolean> thisTask, String callbackTag, Boolean returnStatus, String responseString) {

        CustomLog.callingMethod(LOG_TAG);

        // HTTP request callback handler for Login function
        if (Utilities.compare(callbackTag, "GetSpotifyUserProfile")) {
            CustomLog.d(LOG_TAG, "OnTaskCompleted for tag: GetSpotifyUserProfile, with return status: " + returnStatus + "  responseString: " + responseString);

            if (returnStatus) {
                CustomLog.i(LOG_TAG, "GetSpotifyUserProfile success, parsing JSON");

                try {
                    JSONObject userProfileJSONObject = new JSONObject(responseString);

                    getJavaScriptInterface().setUsername(userProfileJSONObject.getString("id"));
                } catch (Exception e) {
                    CustomLog.exception(LOG_TAG, e);
                }

                Config playerConfig = new Config(this, currentSpotifyAccessToken, getString(R.string.client_id));
                Spotify spotify = new Spotify();
                mPlayer = spotify.getPlayer(playerConfig, this, new Player.InitializationObserver() {
                    @Override
                    public void onInitialized() {
                        CustomLog.callingMethod(LOG_TAG);

                        mPlayer.addConnectionStateCallback(MainActivity.this);
                        mPlayer.addPlayerNotificationCallback(MainActivity.this);

                        String username = getJavaScriptInterface().getUsername();
                        String version = getJavaScriptInterface().getVersion() + "-android";
                        String pepperedUsername = username + getString(R.string.server_login_pepper);

                        try {
                            MessageDigest digest = MessageDigest.getInstance("SHA-256");
                            byte[] pepperedUsernameHash = digest.digest(pepperedUsername.getBytes("UTF-8"));
                            String pepperedUsernameHashHexString = new String(Hex.encodeHex(pepperedUsernameHash));

                            String loginURL = "http://app.soundbounce.org/spotify-login/" + username + "?secret=" + pepperedUsernameHashHexString + "&version=" + version;
                            CustomLog.i(LOG_TAG, "Redirecting webview to server auth URL");

                            mXwalkView.load(loginURL, null);

                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        CustomLog.callingMethod(LOG_TAG);

                        CustomLog.e(LOG_TAG, "Could not initialize player: " + throwable.getMessage());
                    }
                });
            } else {
                CustomLog.d(LOG_TAG, "GetSpotifyUserProfile returnStatus was false");
            }

        }
    }

}