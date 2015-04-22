package org.soundbounce.soundbounce.activities;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;

import com.spotify.sdk.android.Spotify;
import com.spotify.sdk.android.authentication.AuthenticationClient;
import com.spotify.sdk.android.authentication.AuthenticationRequest;
import com.spotify.sdk.android.authentication.AuthenticationResponse;
import com.spotify.sdk.android.playback.Config;
import com.spotify.sdk.android.playback.ConnectionStateCallback;
import com.spotify.sdk.android.playback.Player;
import com.spotify.sdk.android.playback.PlayerNotificationCallback;
import com.spotify.sdk.android.playback.PlayerState;

import org.acra.ACRA;
import org.apache.commons.codec.binary.Hex;
import org.json.JSONObject;
import org.soundbounce.soundbounce.R;
import org.soundbounce.soundbounce.helpers.CustomLog;
import org.soundbounce.soundbounce.helpers.CustomXWalkResourceClient;
import org.soundbounce.soundbounce.helpers.CustomXWalkUIClient;
import org.soundbounce.soundbounce.helpers.CustomXWalkView;
import org.soundbounce.soundbounce.helpers.Utilities;
import org.soundbounce.soundbounce.interfaces.OnTaskCompletedInterface;
import org.soundbounce.soundbounce.interfaces.SpotifyBrowserAPIInterface;
import org.soundbounce.soundbounce.tasks.HttpRequestAsyncTask;
import org.xwalk.core.XWalkPreferences;
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
    protected CustomXWalkView xWalkView = null;
    protected String userAgentString;

    protected Player mPlayer;

    protected String currentSpotifyAccessToken = null;
    public ProgressDialog appLoadingProgress;
    public ProgressDialog spotifyLoadingProgress;

    // Request code that will be used to verify if the result comes from correct activity
    private static final int SPOTIFY_AUTH_REQUEST_CODE = 1337;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        CustomLog.callingMethod(LOG_TAG);

        super.onCreate(savedInstanceState);
        singleton = this;

        // Get intent, action and MIME type
        Intent incomingIntent = getIntent();

        if (incomingIntent.getBooleanExtra("EXIT", false)) {
            CustomLog.i(LOG_TAG, "onCreate() booleanExtra contained EXIT so finish activity, hopefully quitting PODFather...");
            finish();

            Intent startMain = new Intent(Intent.ACTION_MAIN);
            startMain.addCategory(Intent.CATEGORY_HOME);
            startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(startMain);

            return;
        }

        // Set up window and content view to hold full screen webview
        getWindow().requestFeature(Window.FEATURE_NO_TITLE);

        // Enable awesome chrome developer tools linking from chrome://inspect on connected machine
        XWalkPreferences.setValue(XWalkPreferences.REMOTE_DEBUGGING, true);
        XWalkPreferences.setValue(XWalkPreferences.ALLOW_UNIVERSAL_ACCESS_FROM_FILE, true);
        XWalkPreferences.setValue(XWalkPreferences.JAVASCRIPT_CAN_OPEN_WINDOW, true);

        setContentView(R.layout.xwalk_with_progressbar);

        // Get reference to xWalkView which should have been inflated along with the rest of the view above
        xWalkView = getXWalkView();

        xWalkView.setBackgroundColor(Color.BLACK);
        xWalkView.setDrawingCacheBackgroundColor(Color.BLACK);

        // Set custom webview chrome and client to handle browser activities such as page loading and back history etc
        xWalkView.setResourceClient(new CustomXWalkResourceClient(xWalkView));
        xWalkView.setUIClient(new CustomXWalkUIClient(xWalkView));

        xWalkView.setHapticFeedbackEnabled(true);
        xWalkView.setOverScrollMode(View.OVER_SCROLL_ALWAYS);

        xWalkView.setFocusableInTouchMode(true);
        xWalkView.requestFocus();

        // Add the NativeWrapper JavaScript interface for the browser package to interact with the android functionality
        xWalkView.addJavascriptInterface(getJavaScriptInterface(), "spotifyBrowserApi");

        // Set the XWalkView user agent string so the Soundbounce server correctly identifies us
        userAgentString = "Soundbounce-Android-" + getJavaScriptInterface().getVersion();

        Method ___getBridge = null;
        try {
            ___getBridge = XWalkView.class.getDeclaredMethod("getBridge");
            ___getBridge.setAccessible(true);
            XWalkViewBridge xWalkViewBridge = null;
            xWalkViewBridge = (XWalkViewBridge) ___getBridge.invoke(xWalkView);
            XWalkSettings xWalkSettings = xWalkViewBridge.getSettings();
            xWalkSettings.setUserAgentString(userAgentString);
        } catch (Exception e) {
            e.printStackTrace();
        }

        xWalkView.load("http://app.soundbounce.org/login.html", null);
    }

    public CustomXWalkView getXWalkView() {
        if (xWalkView == null) {
            xWalkView = (CustomXWalkView) findViewById(R.id.xWalkView);
        }
        return xWalkView;
    }

    public void launchSpotifyAuthentication() {

        // Start authentication with Spotify
        AuthenticationRequest.Builder builder = new AuthenticationRequest.Builder(
                getString(R.string.client_id),
                AuthenticationResponse.Type.TOKEN,
                "soundbounce://callback");

        builder.setScopes(new String[]{"user-read-private", "streaming"});

        AuthenticationRequest request = builder.build();

        AuthenticationClient.openLoginActivity(this, SPOTIFY_AUTH_REQUEST_CODE, request);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        super.onActivityResult(requestCode, resultCode, intent);

        // Check if result comes from the correct activity
        if (requestCode == SPOTIFY_AUTH_REQUEST_CODE) {
            AuthenticationResponse response = AuthenticationClient.getResponse(resultCode, intent);
            if (response.getType() == AuthenticationResponse.Type.TOKEN) {

                currentSpotifyAccessToken = response.getAccessToken();

                if(spotifyLoadingProgress != null)
                {
                    spotifyLoadingProgress.dismiss();
                }

                appLoadingProgress = new ProgressDialog(this);
                appLoadingProgress.setMessage("Authenticating with Spotify...");
                appLoadingProgress.setIndeterminate(true);
                appLoadingProgress.setCancelable(false);
                appLoadingProgress.show();

                String authenticatedUserProfileURL = "https://api.spotify.com/v1/me";

                HashMap<String, String> httpHeaders = new HashMap<String, String>();
                httpHeaders.put("Authorization", "Bearer " + currentSpotifyAccessToken);

                // Create and execute the HTTP request task
                HttpRequestAsyncTask httpRequestAsyncTask = new HttpRequestAsyncTask(this, this, "GetSpotifyUserProfile", "GET", authenticatedUserProfileURL, 5000, null, httpHeaders, null, null);
                httpRequestAsyncTask.execute();
            }
            else
            {
                CustomLog.d(LOG_TAG, "Spotify Authentication response type was not token, it was: " + response.getType());
            }
        }
        else
        {
            CustomLog.d(LOG_TAG, "Activity result did not have Spotify Auth requestCode");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        CustomLog.callingMethod(LOG_TAG);

        super.onNewIntent(intent);
    }


    // Open previous opened link from history on webview when back button pressed, unless we're already at the login page
    @Override
    public void onBackPressed() {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.i(LOG_TAG, "onBackPressed override called, doing nothing as back button is handled by dispatchKeyEvent override");
    }

    @Override
    public boolean dispatchKeyEvent(@NonNull KeyEvent event) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.i(LOG_TAG, "Key event caught by MainActivity with keycode: " + event.getKeyCode() + " and action: " + event.getAction());

        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            CustomLog.i(LOG_TAG, "Caught KEYCODE_BACK key press, checking whether to just quit or to call PFCallbacks.backButtonPressed() JS callback");

            quitSoundbounce();

            return true;
        }
        else
        {
            super.dispatchKeyEvent(event);
            return false;
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, @NonNull KeyEvent event) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.i(LOG_TAG, "Key down caught by MainActivity for keycode: " + keyCode);

        super.onKeyDown(keyCode, event);
        return false;
    }

    @Override
    public boolean onKeyUp(int keyCode, @NonNull KeyEvent event) {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.i(LOG_TAG, "Key up caught by MainActivity for keycode: " + keyCode);

        super.onKeyUp(keyCode, event);
        return false;
    }

    public void quitSoundbounce() {
        CustomLog.callingMethod(LOG_TAG);

        if(appLoadingProgress != null)
        {
            appLoadingProgress.dismiss();
        }

        if(spotifyLoadingProgress != null)
        {
            spotifyLoadingProgress.dismiss();
        }

        Intent intent = new Intent(getApplicationContext(), MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("EXIT", true);
        startActivity(intent);
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

                    ACRA.getErrorReporter().putCustomData("Spotify Username", getJavaScriptInterface().getUsername() );
                } catch (Exception e) {
                    CustomLog.exception(LOG_TAG, e);
                }

                Config playerConfig = new Config(this, currentSpotifyAccessToken, getString(R.string.client_id));
                mPlayer = Spotify.getPlayer(playerConfig, this, new Player.InitializationObserver() {
                    @Override
                    public void onInitialized(Player player) {
                        try {
                            CustomLog.callingMethod(LOG_TAG);

                            mPlayer.addConnectionStateCallback(MainActivity.this);
                            mPlayer.addPlayerNotificationCallback(MainActivity.this);

                            String username = getJavaScriptInterface().getUsername();
                            String version = getJavaScriptInterface().getVersion() + "-android";
                            String pepperedUsername = username + getString(R.string.server_login_pepper);

                            ACRA.getErrorReporter().putCustomData("Spotify Username", username );
                            ACRA.getErrorReporter().putCustomData("Peppered Username", pepperedUsername );

                            MessageDigest digest = MessageDigest.getInstance("SHA-256");
                            byte[] pepperedUsernameHash = digest.digest(pepperedUsername.getBytes("UTF-8"));
                            String pepperedUsernameHashHexString = new String(Hex.encodeHex(pepperedUsernameHash));

                            String loginURL = "http://app.soundbounce.org/spotify-login/" + username + "?secret=" + pepperedUsernameHashHexString + "&version=" + version;
                            CustomLog.i(LOG_TAG, "Redirecting webview to server auth URL");

                            ACRA.getErrorReporter().putCustomData("Soundbounce Login URL", loginURL );

                            xWalkView.load(loginURL, null);

                        } catch (Exception e) {
                            CustomLog.exception(LOG_TAG, e);

                            ACRA.getErrorReporter().handleException(e, true);

                            quitSoundbounce();
                        }
                    }

                    @Override
                    public void onError(Throwable throwable) {
                        CustomLog.callingMethod(LOG_TAG);

                        CustomLog.e(LOG_TAG, "Could not initialize player: " + throwable.getMessage());

                        ACRA.getErrorReporter().handleException(throwable);

                        quitSoundbounce();
                    }
                });

            } else {
                CustomLog.e(LOG_TAG, "GetSpotifyUserProfile returnStatus was false");

                Exception caughtException = new Exception("GetSpotifyUserProfile returnStatus was false");
                ACRA.getErrorReporter().handleException(caughtException);

                quitSoundbounce();
            }

        }
    }

}