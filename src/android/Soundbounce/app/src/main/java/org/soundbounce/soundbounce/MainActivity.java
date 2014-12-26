package org.soundbounce.soundbounce;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
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
import org.xwalk.core.XWalkPreferences;
import org.xwalk.core.XWalkResourceClient;
import org.xwalk.core.XWalkUIClient;
import org.xwalk.core.XWalkView;
import org.xwalk.core.internal.XWalkSettings;
import org.xwalk.core.internal.XWalkViewBridge;

import java.lang.reflect.Method;
import java.security.MessageDigest;

public class MainActivity extends Activity implements PlayerNotificationCallback, ConnectionStateCallback {

    protected static MainActivity singleton;
    protected SpotifyBrowserAPIInterface javaScriptInterface;
    protected XWalkView mXwalkView = null;
    protected Player mPlayer;

    public static final String CLIENT_ID = "5e09eead40dd4c6cb313724360fcc8d3";
    public static final String REDIRECT_URI = "soundbounce://callback";
    public static final String SERVER_LOGIN_PEPPER = "SECRET";

    class MyResourceClient extends XWalkResourceClient {
        MyResourceClient(XWalkView view) {
            super(view);
        }
    }

    class MyUIClient extends XWalkUIClient {
        MyUIClient(XWalkView view) {
            super(view);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (mXwalkView != null) {
            mXwalkView.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        singleton = this;

        // Set up window and content view to hold full screen webview
        getWindow().requestFeature(Window.FEATURE_NO_TITLE);

        XWalkPreferences.setValue(XWalkPreferences.REMOTE_DEBUGGING, true);
        XWalkPreferences.setValue(XWalkPreferences.ALLOW_UNIVERSAL_ACCESS_FROM_FILE, true);
        XWalkPreferences.setValue(XWalkPreferences.JAVASCRIPT_CAN_OPEN_WINDOW, true);

        mXwalkView = new XWalkView(this, this);
        setContentView(mXwalkView);
        mXwalkView.setResourceClient(new MyResourceClient(mXwalkView));
        mXwalkView.setUIClient(new MyUIClient(mXwalkView));

        mXwalkView.addJavascriptInterface(getJavaScriptInterface(), "spotifyBrowserApi");

        Method ___getBridge = null;
        try {
            ___getBridge = XWalkView.class.getDeclaredMethod("getBridge");
            ___getBridge.setAccessible(true);
            XWalkViewBridge xWalkViewBridge = null;
            xWalkViewBridge = (XWalkViewBridge)___getBridge.invoke(mXwalkView);
            XWalkSettings xWalkSettings = xWalkViewBridge.getSettings();
            xWalkSettings.setUserAgentString("Soundbounce-Android-" + getJavaScriptInterface().getVersion());
        } catch (Exception e) {
            e.printStackTrace();
        }

        setContentView(mXwalkView);

        mXwalkView.load("http://app.soundbounce.org/login.html", null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri uri = intent.getData();
        if (uri != null) {
            AuthenticationResponse response = SpotifyAuthentication.parseOauthResponse(uri);
            Config playerConfig = new Config(this, response.getAccessToken(), CLIENT_ID);
            Spotify spotify = new Spotify();
            mPlayer = spotify.getPlayer(playerConfig, this, new Player.InitializationObserver() {
                @Override
                public void onInitialized() {
                    mPlayer.addConnectionStateCallback(MainActivity.this);
                    mPlayer.addPlayerNotificationCallback(MainActivity.this);

                    String username = getJavaScriptInterface().getUsername();
                    String version = getJavaScriptInterface().getVersion() + "-android";
                    String pepperedUsername = username + SERVER_LOGIN_PEPPER;

                    try {
                        MessageDigest digest = MessageDigest.getInstance("SHA-256");
                        byte[] pepperedUsernameHash = digest.digest(pepperedUsername.getBytes("UTF-8"));
                        String pepperedUsernameHashHexString = new String( Hex.encodeHex(pepperedUsernameHash) );

                        String loginURL = "http://app.soundbounce.org/spotify-login/" + username + "?secret=" + pepperedUsernameHashHexString + "&version=" + version;
                        Log.i("MainActivity", "Redirecting webview to server auth URL");

                        mXwalkView.load(loginURL, null);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @Override
                public void onError(Throwable throwable) {
                    Log.e("MainActivity", "Could not initialize player: " + throwable.getMessage());
                }
            });
        }
    }

    @Override
    public void onBackPressed()
    {
        Log.i("", "onBackPressed called, calling finish() to quit the app");
        finish();
    }

    @Override
    public void onLoggedIn() {
        Log.d("MainActivity", "User logged in");
    }

    @Override
    public void onLoggedOut() {
        Log.d("MainActivity", "User logged out");
    }

    @Override
    public void onLoginFailed(Throwable error) {
        Log.d("MainActivity", "Login failed");
    }

    @Override
    public void onTemporaryError() {
        Log.d("MainActivity", "Temporary error occurred");
    }

    @Override
    public void onNewCredentials(String s) {
        Log.d("MainActivity", "User credentials blob received");
    }

    @Override
    public void onConnectionMessage(String message) {
        Log.d("MainActivity", "Received connection message: " + message);
    }

    @Override
    public void onPlaybackEvent(EventType eventType, PlayerState playerState) {
        Log.d("MainActivity", "Playback event received: " + eventType.name());
    }

    @Override
    public void onPlaybackError(ErrorType errorType, String errorDetails) {
        Log.d("MainActivity", "Playback error received: " + errorType.name());
    }

    @Override
    protected void onDestroy() {
        Spotify.destroyPlayer(this);
        super.onDestroy();
    }

    public static MainActivity getInstance() {
        return singleton;
    }

    public SpotifyBrowserAPIInterface getJavaScriptInterface()
    {
        if (javaScriptInterface == null)
        {
            javaScriptInterface = new SpotifyBrowserAPIInterface();
        }
        return javaScriptInterface;
    }

    public Player getPlayer()
    {
        return mPlayer;
    }
}