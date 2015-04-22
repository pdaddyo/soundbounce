package org.soundbounce.soundbounce.helpers;

import org.soundbounce.soundbounce.activities.MainActivity;
import org.xwalk.core.XWalkResourceClient;
import org.xwalk.core.XWalkView;

public class CustomXWalkResourceClient extends XWalkResourceClient {

    protected final String LOG_TAG = "CustomXWalkResourceClient";

    public CustomXWalkResourceClient(XWalkView view) {
        super(view);
    }

    @Override
    public boolean shouldOverrideUrlLoading(XWalkView view, String url) {
        CustomLog.callingMethod(LOG_TAG);

        if (url.startsWith("soundbounce:")) {

            CustomLog.i(LOG_TAG, "Caught soundbounce url: " + url);

            return true;
        }

        return false;
    }

    @Override
    public void onLoadStarted(XWalkView view, String url) {
        //CustomLog.callingMethod(LOG_TAG);

        //CustomLog.v(LOG_TAG, "Started loading url: " + url);
    }

    @Override
    public void onLoadFinished(XWalkView view, String url) {
        CustomLog.callingMethod(LOG_TAG);

        // CustomLog.i(LOG_TAG, "Finished loading url: " + url);

        if (url.contains("app.html#home")) {
            if(MainActivity.getInstance().appLoadingProgress != null)
            {
                MainActivity.getInstance().appLoadingProgress.dismiss();
            }

            if(MainActivity.getInstance().spotifyLoadingProgress != null)
            {
                MainActivity.getInstance().spotifyLoadingProgress.dismiss();
            }
        }

        if (url.contains("social.html")) {
            if(MainActivity.getInstance().appLoadingProgress != null)
            {
                MainActivity.getInstance().appLoadingProgress.dismiss();
            }

            if(MainActivity.getInstance().spotifyLoadingProgress != null)
            {
                MainActivity.getInstance().spotifyLoadingProgress.dismiss();
            }
        }

        if (url.contains("accounts.spotify.com")) {

            if(MainActivity.getInstance().spotifyLoadingProgress != null)
            {
                MainActivity.getInstance().spotifyLoadingProgress.dismiss();
            }
        }
    }
}
