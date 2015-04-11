package org.soundbounce.soundbounce.helpers;

import android.content.Context;
import android.util.AttributeSet;
import android.view.KeyEvent;

import org.soundbounce.soundbounce.activities.MainActivity;
import org.xwalk.core.XWalkView;

public class CustomXWalkView extends XWalkView {

    protected final String LOG_TAG = "CustomXWalkView";

    public CustomXWalkView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        CustomLog.callingMethod(LOG_TAG);

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            MainActivity.getInstance().quitSoundbounce();

            return false;
        }

        return super.onKeyDown(keyCode, event);
    }
}
