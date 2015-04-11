package org.soundbounce.soundbounce.helpers;

import org.acra.ACRA;
import org.xwalk.core.XWalkUIClient;
import org.xwalk.core.XWalkView;

public class CustomXWalkUIClient extends XWalkUIClient {

    // Used to write to the system log from this class.
    public static final String LOG_TAG = "CustomUIClient";

    public CustomXWalkUIClient(XWalkView view) {
        super(view);
    }

    @Override
    public void onPageLoadStarted(XWalkView view, java.lang.String url)
    {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.i(LOG_TAG, "Page load started for url: " + url + " started by: " + CustomLog.getCallingMethodsString());

    }

    @Override
    public void onPageLoadStopped(XWalkView view, java.lang.String url, XWalkUIClient.LoadStatus status)
    {
        CustomLog.callingMethod(LOG_TAG);

        CustomLog.i(LOG_TAG, "Page load finished for url: " + url + " started by: " + CustomLog.getCallingMethodsString());

    }

    @Override
    public boolean onConsoleMessage(XWalkView view, String message, int lineNumber, String sourceId, ConsoleMessageType messageType)
    {
        String logMessage = "Caught Chromium Console Message: " + message + " \nof type: " + messageType.toString() + " \nfrom lineNumber: " + lineNumber + " \nand sourceId: " + sourceId;

        if(messageType == ConsoleMessageType.DEBUG)
        {
            CustomLog.d(LOG_TAG, logMessage);
        }
        else if(messageType == ConsoleMessageType.LOG || messageType == ConsoleMessageType.INFO)
        {
            CustomLog.i(LOG_TAG, logMessage);
        }
        else if(messageType == ConsoleMessageType.WARNING)
        {
            CustomLog.w(LOG_TAG, logMessage);
        }
        else if(messageType == ConsoleMessageType.ERROR)
        {
            CustomLog.e(LOG_TAG, logMessage);

            Exception e = new Exception(logMessage);
            ACRA.getErrorReporter().handleException(e, true);
        }
        else
        {
            CustomLog.e(LOG_TAG, logMessage);

            Exception e = new Exception(logMessage);
            ACRA.getErrorReporter().handleException(e, true);
        }

        return super.onConsoleMessage(view, message, lineNumber, sourceId, messageType);
    }

}

